<template>
  <div :class="$style['row']" >
    <div class="flex-1 flex items-center px-2 overflow-hidden gap-x-1 whitespace-nowrap">
      <ui-checkbox v-model="mod.isEnabled"></ui-checkbox>
      <span class="truncate">{{ mod.matcher }}</span>
    </div>
    <div class="flex items-baseline gap-x-4">
      <button @click="$emit('remove', mod)" class="flex items-center mx-1 py-1">
        <i class="w-4 fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { AltCraftingMod } from '../overlay/widgets';

export default defineComponent({
  emits: ['remove'],
  props: {
    mod: {
      type: Object as PropType<AltCraftingMod>, 
      required: true 
    }
  },
  setup () {
    const { t } = useI18n();

    return {
      t
    }
  }
})
</script>

<style lang="postcss" module>
.row {
  display: flex;
  align-items: center;
  width: 100%;
  @apply h-8;
  cursor: default;
  line-height: 1;
}

.row:hover {
  @apply bg-gray-700;
}

.row:not(:hover) .controls-auto-hide {
  display: none !important;
}

.tag {
  @apply px-1;
  @apply rounded;
  line-height: 1;
}
.tag-heist {
  @apply bg-red-800;
}
.tag-uber {
  @apply bg-purple-600;
}
.tag-outdated {
  @apply bg-red-400 text-black;
}
</style>
