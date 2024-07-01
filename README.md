##
一个奇怪的问题。
一切的起源，本项目是对以下代码中 try catch 部分导致内存泄漏的可能性的研究。
https://github.dev/element-plus/element-plus

packages/components/table/src/table-column/index.ts

```javascript
render() {
  try {
    const renderDefault = this.$slots.default?.({
      row: {},
      column: {},
      $index: -1,
    })
    const children = []
    if (Array.isArray(renderDefault)) {
      for (const childNode of renderDefault) {
        if (
          childNode.type?.name === 'ElTableColumn' ||
          childNode.shapeFlag & 2
        ) {
          children.push(childNode)
        } else if (
          childNode.type === Fragment &&
          Array.isArray(childNode.children)
        ) {
          childNode.children.forEach((vnode) => {
            // No rendering when vnode is dynamic slot or text
            if (vnode?.patchFlag !== 1024 && !isString(vnode?.children)) {
              children.push(vnode)
            }
          })
        }
      }
    }
    const vnode = h('div', children)
    return vnode
  } catch {
    return h('div', [])
  }
},
```

## 操作步骤
1.启动项目
```
npm i
npm run dev
```

2.chrome打开 http://localhost:4000/

3.打开chrome devtools

4。在runtime-core.esm-bundler.js中，添加日志代码行断点(logpoint)

![](/img/img_1.png)
```javascript
line: 7085
'open blockStack.length:', blockStack.length
```

![](/img/img_2.png)
```javascript
line: 7088
'close blockStack.length:', blockStack.length, blockStack
```

5. 查看控制台日志
![](/img/img_3.png)

6. 点击 showError 按钮，切换 showError 的值

7. 此时控制台日志
![](/img/img_4.png)

## 原因分析

src/App.vue

```html
<template>
  <div>
    <h2>Memory leakage</h2>
    <RenderFnSlotComponent>
      <template v-slot="scope">
        <AComponent v-if="show" />
        <span v-if="showError">{{ scope.data.name }}</span>
        <span v-else>{{ scope }}</span>
      </template>
    </RenderFnSlotComponent>
    <BComponent></BComponent>
    <button @click="showError = !showError">showError:{{ showError }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AComponent from './components/AComponent.vue'
import BComponent from './components/BComponent.vue'
import RenderFnSlotComponent from './components/RenderFnSlotComponent'

const show = ref(true)
const showError = ref(false)
</script>
```

src/components/BComponent.vue
```html
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

setInterval(() => count.value++, 1000)
</script>

<template>
  <div v-if="count >= 0" type="button">time count is {{ count }}</div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>

```

src/components/RenderFnSlotComponent.ts
```javascript
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
```

RenderFnSlotComponent 在渲染函数主动处理了渲染函数运行时发生异常。这虽然能够使整体渲染过程成功进行，但这导致了 vue 内部 blockStack 在渲染后没有正确的被清空。 

我们可以来看一下 APP.vue 被编译后，实际运行的渲染函数(省略了部分无关内容)
```javascript
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return _openBlock(), _createElementBlock("div", null, [
    _hoisted_1,
    _createVNode($setup["RenderFnSlotComponent"], null, {
      default: _withCtx((scope) => [
        ...
        $setup.showError ? (_openBlock(), _createElementBlock(
          "span",
          _hoisted_2,
          _toDisplayString(scope.data.name),
          1
          /* TEXT */
        )) : (_openBlock(), _createElementBlock(
          "span",
          _hoisted_3,
          _toDisplayString(scope),
          1
          /* TEXT */
        ))
      ]),
      _: 1
      /* STABLE */
    }),
      ...
    )
  ]);
}
```

当 showError 为 true 时，传入 RenderFnSlotComponent 的 default slot 在调用时，会先 _openBlock()，然后在 scope.data.name 处发生异常，_createElementBlock 没能成功被调用，而 createElementBlock 的一个内部逻辑就是调用closeBlock。

此时，就导致新的一个问题，当 blockStack 未能正确置空的情况下。之后的渲染，即使是正常的渲染流程。也会把之前渲染过程中在 blockStack 中残联的 block 列表，当做自己的父级。这导致动态vnode，被错误的收集到了 blockStack 中。内存泄漏的情况会不断加剧。

所以 RenderFnSlotComponent 中的异常处理，并没有提示健壮性。还引入了跟严重的内存泄漏问题。所以，建议移除渲染函数中的异常处理部分。