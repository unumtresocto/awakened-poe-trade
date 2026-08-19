<template>
  <Widget
    :config="config"
    :move-handles="['tl', 'bl']"
    :removable="false"
    :inline-edit="false"
  >
    <div
      class="widget-default-style flex flex-col p-1 gap-1"
      style="min-width: 24rem"
    >
      <div class="bg-gray-800 rounded">
        <div v-if="viewMode === 'default'">
          <div class="flex gap-x-1 p-1 items-center">
            <label class="flex items-center gap-x-1 cursor-pointer">
              <input
                type="checkbox"
                v-model="searchMode"
                true-value="ALL"
                false-value="ANY"
              />
              <span class="text-gray-400">ALL</span>
            </label>
            <button @click="() => (viewMode = 'load_preset')" class="btn">
              Load preset
            </button>
            <button @click="() => (viewMode = 'save_preset')" class="btn">
              Save preset
            </button>
            <button @click="() => (viewMode = 'delete_preset')" class="btn">
              Delete preset
            </button>
          </div>
          <div class="flex gap-x-1 p-1">
            <div class="p-1">{{ selectedPresetName }}</div>
            <input
              type="text"
              :placeholder="'Enter new mod'"
              class="rounded bg-gray-900 px-1 flex-1"
              v-model="searchValue"
            />
            <button @click="addNewMod(searchValue)" class="btn">
              {{ t(":add") }}
            </button>
            <button @click="clearSelectedMods" class="btn">
              <i class="fas fa-times" /> {{ t(":reset") }}
            </button>
          </div>
          <div class="flex flex-col">
            <div v-for="mod of mods" :key="mod.id">
              <AltCraftingModEntry :mod="mod" @remove="removeMod" />
            </div>
          </div>
        </div>
        <div v-if="viewMode === 'save_preset'">
          <div class="flex gap-1 p-1">
            <input
              type="text"
              :placeholder="t(':preset_name')"
              class="rounded bg-gray-900 px-1 flex-1"
              v-model="newPresetName"
            />
            <button
              @click="
                () => {
                  savePreset(newPresetName, mods) && (viewMode = 'default');
                }
              "
              class="btn"
            >
              Save preset
            </button>
            <button
              @click="
                () => {
                  viewMode = 'default';
                  saveError = null;
                }
              "
              class="btn"
            >
              Cancel
            </button>
          </div>
          <div class="flex gap-1 p-1" v-if="saveError !== null">
            {{ saveError }}
          </div>
          <div class="flex gap-1 p-1">
            <button
              v-for="preset of presetNames"
              :class="$style.searchBtn"
              @click="
                () => {
                  savePreset(preset, mods, true) && (viewMode = 'default');
                }
              "
            >
              {{ preset }}
            </button>
          </div>
        </div>
        <div v-if="viewMode === 'load_preset'">
          <div class="flex gap-1 p-1">
            <button @click="() => (viewMode = 'default')" class="btn">
              Cancel
            </button>
          </div>
          <div class="flex gap-1 p-1">
            <button
              v-for="preset of presetNames"
              :class="$style.searchBtn"
              @click="
                () => {
                  loadPreset(preset);
                  viewMode = 'default';
                }
              "
            >
              {{ preset }}
            </button>
          </div>
        </div>
        <div v-if="viewMode === 'delete_preset'">
          <div class="flex gap-1 p-1">
            <button @click="() => (viewMode = 'default')" class="btn">
              Cancel
            </button>
          </div>
          <div class="flex gap-1 p-1">
            <button
              v-for="preset of presetNames"
              :class="$style.searchBtn"
              @click="deletePreset(preset)"
            >
              {{ preset }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Widget>
</template>

<script lang="ts">
import { ref } from "vue";
import { CLIENT_STRINGS as _$, STATS_ITERATOR } from "@/assets/data";
import AltCraftingModEntry from "./AltCraftingModEntry.vue";
import { Host } from "../background/IPC.js";
import {
  AppConfig,
  Config,
  pushHostConfig,
  saveConfig,
  updateConfig,
} from "../Config.js";
import {
  AltCraftingWidget,
  AltCraftingMod,
  AltCraftingPreset,
} from "../overlay/widgets.js";

export default {
  widget: {
    type: "alt-crafting",
    instances: "single",
    initInstance: (): AltCraftingWidget => {
      return {
        wmId: 104,
        wmType: "alt-crafting",
        wmTitle: "Alt Crafting",
        wmWants: "hide",
        wmZorder: 104,
        wmFlags: ["invisible-on-blur"],
        hotkey: "F7",
        anchor: {
          pos: "tl",
          x: 34,
          y: 56,
        },
        presets: {
          physaxe: [
            { matcher: "tyrannical", id: "1", isEnabled: true },
            { matcher: "emperor", id: "2", isEnabled: true },
            { matcher: "dictator", id: "3", isEnabled: true },
            { matcher: "merciless", id: "4", isEnabled: true },
            { matcher: "flaring", id: "5", isEnabled: true },
            { matcher: "cruel", id: "6", isEnabled: true },
            { matcher: "conqueror", id: "7", isEnabled: true },
          ],
          physjew: [
            { matcher: "annealed", id: "1", isEnabled: true },
            { matcher: "razor", id: "2", isEnabled: true },
            { matcher: "tempered", id: "3", isEnabled: true },
            { matcher: "flaring", id: "4", isEnabled: true },
            { matcher: "training", id: "5", isEnabled: true },
            { matcher: "venom", id: "6", isEnabled: true },
          ],
          tinctura: [
            { matcher: "unleashed||overpowering", id: "1", isEnabled: true },
            { matcher: "horticultural||medicinal", id: "2", isEnabled: true },
          ],
        },
        currentPreset: "physaxe",
        searchMode: "ANY",
      };
    },
  },
};

function updateModsInConfig(
  preset: AltCraftingPreset,
  mode: "ANY" | "ALL" = "ANY",
) {
  Host.sendEvent({
    name: "CLIENT->MAIN::user-action",
    payload: {
      action: "alt-crafting-update",
      mods: preset.filter((item) => item.isEnabled).map((item) => item.matcher),
      mode,
    },
  });
}

function usePresets(initialConfig: AltCraftingWidget) {
  const saveError = ref<"same_name" | "empty_name" | null>(null);
  const config = ref(initialConfig);
  const selectedPresetName = ref<string>("");
  const selectedPreset = ref<AltCraftingPreset>([]);
  watch(selectedPresetName, (name: string) => {
    selectedPreset.value = name
      ? (AppConfig("alt-crafting") as AltCraftingWidget).presets[name]
      : [];
  });

  function getUpdatedConfig(widgetConfig: AltCraftingWidget) {
    const appConfig: Config = JSON.parse(JSON.stringify(AppConfig()));

    appConfig.widgets = [
      ...appConfig.widgets.filter((item) => item.wmType !== "alt-crafting"),
      widgetConfig,
    ];

    return appConfig;
  }

  function savePreset(
    name: string,
    mods: AltCraftingPreset,
    override = false,
  ): boolean {
    saveError.value = null;

    if (!name) {
      saveError.value = "empty_name";
      return false;
    }
    if (!override && presetNames.value.includes(name)) {
      saveError.value = "same_name";
      return false;
    }

    config.value.presets[name] = JSON.parse(JSON.stringify(mods));
    updateAppConfig();
    selectedPresetName.value = name;

    return true;
  }

  function deletePreset(name: string) {
    delete config.value.presets[name];

    updateAppConfig();
  }

  function loadPreset(presetName: string) {
    selectedPresetName.value = presetName;
  }

  function updateAppConfig() {
    updateConfig(getUpdatedConfig(config.value));
    saveConfig();
    pushHostConfig();
  }

  const presets = computed(() => config.value.presets);
  const presetNames = computed(() => Object.keys(presets.value));

  selectedPresetName.value = initialConfig.currentPreset || "";

  return {
    presetNames,
    saveError,
    selectedPreset,
    selectedPresetName,
    loadPreset,
    savePreset,
    deletePreset,
  };
}

function useSelectedMods(preset: Ref<AltCraftingPreset>) {
  const mods = preset;

  function addMod(newMod: AltCraftingMod) {
    if (mods.value.some((item) => item.id === newMod.id)) return false;

    mods.value = [...mods.value, newMod];

    return true;
  }

  function removeMod(mod: AltCraftingMod) {
    mods.value = mods.value.filter((item) => item.id !== mod.id);
  }

  function clearMods() {
    mods.value = [];
  }

  return { mods, clearMods, addMod, removeMod };
}
</script>

<script setup lang="ts">
import { nextTick, inject, watch, computed, Ref } from "vue";
import { useI18nNs } from "@/web/i18n";
import { WidgetManager } from "../overlay/interfaces.js";

import Widget from "../overlay/Widget.vue";

const props = defineProps<{
  config: AltCraftingWidget;
}>();

const wm = inject<WidgetManager>("wm")!;
const { t } = useI18nNs("alt_crafting");

const viewMode = ref<
  "default" | "save_preset" | "load_preset" | "delete_preset"
>("default");
const searchValue = ref("");
const newPresetName = ref("");
const searchMode = ref<"ANY" | "ALL">("ANY");

nextTick(() => {
  props.config.wmFlags = ["invisible-on-blur"];
});

const {
  presetNames,
  saveError,
  selectedPreset,
  selectedPresetName,
  savePreset,
  deletePreset,
  loadPreset,
} = usePresets(props.config);
const { mods, clearMods, addMod, removeMod } = useSelectedMods(selectedPreset);

function addNewMod(newMatcher: AltCraftingMod["matcher"]) {
  const isAdded = addMod({
    matcher: newMatcher,
    id: new Date().toString(),
    isEnabled: true,
  });

  if (isAdded) {
    searchValue.value = "";
  }
}

function searchMods() {
  const search = searchValue.value.trim();
  const lcSearch = search
    .toLowerCase()
    .split(/\s+/)
    .sort((a, b) => b.length - a.length);
  const lcLongestWord = lcSearch[0];
  if (search.length < 3) return false;

  const MAX_RESULTS = 5; // NOTE: don't want to pick from too many results
  const out = [];

  for (const stat of STATS_ITERATOR(search)) {
    out.push(stat);
    if (out.length > MAX_RESULTS) {
      break;
    }
  }

  console.dir(out);
}

function clearSelectedMods() {
  clearMods();
  props.config.wmFlags = ["invisible-on-blur"];
}

watch(
  [mods, searchMode],
  ([unwrappedMods, mode]) => {
    updateModsInConfig(unwrappedMods, mode);
  },
  { immediate: true },
);
</script>

<style lang="postcss" module>
.itemWrapper {
  @apply pl-1 pt-1;
  overflow: hidden;

  &:hover {
    background: linear-gradient(
      to left,
      theme("colors.gray.800"),
      theme("colors.gray.900")
    );
  }

  button {
    @apply text-gray-600;
    @apply px-1;
    @apply rounded;
  }

  &:hover button {
    @apply text-gray-400;
    @apply bg-gray-700;
  }
}

.searchBtn {
  flex-shrink: 0;
  @apply rounded;
  @apply max-w-sm;
  @apply p-2 leading-4;
  @apply text-gray-100 bg-gray-800;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  &:hover {
    @apply bg-gray-700;
  }
}
</style>
