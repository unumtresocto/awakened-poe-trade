<template>
  <div class="max-w-md p-2">
    <div class="mb-4 flex">
      <label class="flex-1">{{ t('item_search.ocr_gems_key') }}</label>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { configProp } from '../settings/utils.js'
import HotkeyInput from '../settings/HotkeyInput.vue'

export default defineComponent({
  name: 'item_search.name',
  components: { HotkeyInput },
  props: configProp(),
  setup (props) {
    const { t } = useI18n()

    return {
      t
    }
  }
})
</script>
