# Javascript/Vue workflow

## Coding style

* Подключить к текстовому редактору правила *eslint* для репозитория.
Они находятся в `package.json:eslintConfig`, вообщем-то большинство нормальных редакторов
должны их подтгягивать по-умолчанию, как и версию *eslint* из `node_modules` (а не системную)
для случая если системная версия старее и у них будет конфликт конфигураций правил.
Для проверки из консоли:
```bash
npm run lint
```
Правила ниже приведены из-за того, что в модули eslint-а все не запихнешь, ну или
запихнуть не дошли руки.

### Pug

Indent 2 пробела.
Комментарии элементов в pug - только на parent элементе!
```vue
<template lang="pug">
// правильно
// mytag
     my-subtag

// неправильно
// mytaag
//   mysubtag
</template>
```

Перенос аттрибутов элемента на новую строку должен закрываться скобкой в новом отступе. Хотя pug
позволяет делать и так, и так, во втором случае при комментировании parent элемента закрывающуюся
скобку прийдется комментировать отдельно.
Возможно pug исправит в будущем, но так как эта бага до сих пор открыта -
надежд немного https://github.com/pugjs/pug/issues/2770
```vue
<template lang="pug">
// правильно
mytag(
  attr=1
  attr=2
  )
// неправильно
mytag(
  attr=1
  attr=2
)
</template>
```

### Sass
Indent 2 пробела.
Всегда оборачиваем верстку в такую же иерархию, как и в html-е, что-бы легче было понимать что где
находится, а не возвращаться к html-у постоянно.

Внутри .vue файлов мы не используем `<style scoped>`, потому что он с релоадером работает криво.
Вместо этого всегда оборачиваем элемент в класс, который соответсвует названию элемента,
и в стилях заворачиваем все в общий класс.

Пример - файл InputBox.vue
```vue
<template lang="pug">
.input-box
  span.cls1 My shit here
  span.cls2 My shit here
</template>
<style lang="scss">
.input-box {
  .cls1 {
    // my shit here
  }
}
</style>
```
Обратить внимание что есть элементы, которые не наследуются в DOM-е напрямую, а создаются отдельно
(как, например, popup-окна в element-ui создаются реально не в месте обьявления, а в конце страницы),
таким элементам можно передать отдельный класс.  В таком случае этот класс должен быть в namespace
самого элемента, то есть его название обязано начинаться на название элемента.

Пример - файл InputBox.vue
```vue
<template lang="pug">
.input-box
  span.cls1 My shit here
  span.cls2 My shit here
  my-popup(custom-class="input-box-popup")
    span.cls3

</template>
<style lang="scss">
.input-box {
  .cls1 {
    // my shit here
  }
}
.input-box-popup {
  .cls3 {
    // my shit here
  }
}
</style>
```

## Project structure

`./webpack.config.js` - конфигурация вебпака, которым собирается проект.

`./dist` - окончательные файлы сборки, результат работы `npm run build`

`./src/config.js` - конфигурация проекта. Оверрайдится с помощью `./config_local.js`

`./src/index.pug` - индексная страница, в которую webpack инжектит компоненты и скрипты.

`./src/app.js` - инициализация и конфигурация приложения, vue-модулей, third-party библиотек.
Entry-point для webpack'а.

`./src/store.js` - vuex (store, actions, mutations). Выносить actions и данные в store
необходимо *только* если эти данные будут синхронизироваться с разными компонентами
в неопределенной иерархической структуре, то есть когда нельзя явно передавать данные с помощью
props и events. В общем когда есть необходимость сделать это общими данными во всем приложении.

`./src/routes.js` - роуты (vue-router https://router.vuejs.org/).

`./src/api.js` - API бекенда

`./src/styles/app.scss` - общий файл стилей приложения. Инжектится в страницу один раз.
Необходимо держать верстку по возможности в отдельных компонентах, app.scss должен быть минимален.
В основном используется для оверрайда стандартных стилей element-ui, например если оверрайд
необходим на всем проекте, а не разово или в конкретных компонентах.

`./src/styles/common.scss` - этот файл инклудится на всем проекте во все sass, объявленные в компонентах.
Используется для объявления общих миксинов, переменных и т.п.
Например цвета всегда должны использоваться по названиям переменных и модификациям
lighten/darken/saturate/desaturate/adjust-hue/rgba/tintshade.
См. https://robots.thoughtbot.com/controlling-color-with-sass-color-functions

`./src/images/` - изображения проекта. Инклудить обязательно с помощью require, что бы вебпак
поместил изображение оттуда в dist, потому как develop server хоть и обслуживает папку src,
на продакшене она будет недоступна.

`./src/components/` - Компоненты, которые используются в router-е. Если для какой-то
группы компонент необходимы подкомпоненты, которые будут использоваться
только в этой группе, необходимо выносить их в папку `./src/components/my-group`,
в нее добавлять нужные подкомпоненты, которые импортировать уже из этой папки явно:
```vue
<template lang="pug">
my-component-helper(x=1)
</template>
<script>
import MyComponentHelper from './MyComponentHelper'

export default {
  components: {
    MyComponentHelper,
  },
}
</script>
```
В случае если такой компонент ровно один - папка должна называться по имени компонента,
а заглавным файлом быть `main.vue`

`./src/components/common/` - Общие компоненты, которые автоматически инклудятся во все
компоненты приложения. При добавлении необходимо так же добавить экспорт компонента
в `./src/components/common/index.js`, из которого он включается в приложение.

## Responsive layout

В *html* для скрытия элементов используем классы из element-ui:
- http://element.eleme.io/#/en-US/component/layout#utility-classes-for-hiding-elements
- https://github.com/ElementUI/theme-chalk/blob/master/lib/display.css

В *sass* используются переменные из src/styles/common.scss
(соответсвуют названиям размеров в классах из display.css)
```scss
// xs: 0px
$--sm: 768px !default;
$--md: 992px !default;
$--lg: 1200px !default;
$--xl: 1920px !default;
```
Пример использования:
```scss
.el-main {
  padding-right: 30px;
  padding-left: 20px;
  @media screen and (max-width: $--sm - 1) {
    padding-right: 20px;
    padding-left: 10px;
  }
}
```

В *Vue* мы используем плагин `./plugins/ScreenSize.js`, который добавляет в компонент
`$screenSize` и `$contentSize` с шириной, высотой и названием классов по аналогии
с названиями css-классов из element-ui. `$screenSize` - размер viewport, `$contentSize` -
размер контента (с вычетом скрытого или раскрытого меню).
Пример использования:
```vue
<template lang="pug">
el-table
  el-table-column(v-if="$contentSize.lgAndUp")
</template>
```
## I18N

Строки для локализаций хранятся в `src/i18n.yaml` с ключами по языкам. Для локализаций используется https://github.com/kazupon/vue-i18n
Для генерации (нахождения токенов) используется `/scripts/parse_i18n.py` - он найдет новые токены в `src/**.{js,vue}`, добавит их в `src/i18n.yaml`,  пометит тегами #NEW #EMPTY, если есть локализации на других языках - пропишет их в комментарии.
После добавления строк или изменения `src/i18n.yaml` необходимо перегенерировать его с помощью `./scripts/parse_i18n.py`
