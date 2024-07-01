import { h, defineComponent } from 'vue'

export default defineComponent({
  name: "SlotComponent",
  render() {
    try {
      const renderDefault = this.$slots.default?.({data: null})

      return h('div', [
        h('h2', ['this is SlotComponent']),
        renderDefault || h('div', 'slot content is empty')
      ])
    } catch (e) {
      console.log('error')
      return h("div", ['slot-component`s render function occurs error']);
    }
  }
})