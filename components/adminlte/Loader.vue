<template lang="pug">
span
  span(v-if="status === 0")
    slot(name="loading")
      img(src="/src/styles/rolling.svg")
  span(v-else-if="status === 1")
    slot(:data="result")
      span {{ result }}
  span(v-else-if="status === 2")
    slot(name="error" :error="result")
      span.error
</template>

<script>
import { ApiError } from '../../api'

// https://loading.io/spinner/custom/32272/

export default {
  props: ['value'],

  data () {
    return {
      // 0 for pending, 1 for fulfilled, or 2 for rejected
      status: 0,
      result: null,
    }
  },

  created () {
    if (this.value instanceof Promise) {
      this.value.then(data => {
        this.status = 1
        this.result = data
      }, error => {
        this.status = 2
        this.result = error
      })
    } else {
      if (this.value != null) {
        this.setValue()
      } else {
        this.unwatch = this.$watch('value', this.setValue)
      }
    }
  },

  methods: {
    setValue () {
      if (this.value instanceof ApiError) {
        this.status = 2
        this.result = this.value
      } else {
        this.status = 1
        this.result = this.value
      }
      this.unwatch && this.unwatch()
    },
  },
}
</script>
<style scoped>
.loader,
.loader:before,
.loader:after {
  border-radius: 50%;
  width: 10px;
  height: 10px;
  animation-fill-mode: both;
  animation: load7 1.8s infinite ease-in-out;
}
.loader {
  color: #00a65a;
  font-size: 10px;
  margin: 10px auto;
  position: relative;
  text-indent: -9999em;
  transform: translateZ(0);
  animation-delay: -0.16s;
}
.loader:before,
.loader:after {
  content: '';
  position: absolute;
  top: 0;
}
.loader:before {
  left: -15px;
  animation-delay: -0.32s;
}
.loader:after {
  left: 15px;
}
@keyframes load7 {
  0%,
  80%,
  100% {
    box-shadow: 0 10px 0 -5px;
  }
  40% {
    box-shadow: 0 10px 0 0;
  }
}
</style>
