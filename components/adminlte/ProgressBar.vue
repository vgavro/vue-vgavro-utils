<template lang="pug">
.progress(:class="{'thin': thin}")
  .progress-bar.progress-bar-success.progress-bar-striped.active(
    role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"
  )
    span(v-if="text && !thin")
      | {{text}}
      span.dotdotdot
</template>

<script>
export default {
  props: {
    text: {
      type: String,
      default: 'Please wait',
    },
    thin: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped>
.progress.thin {
  height: 5px;
  margin-bottom: 0px;  /* default 20 */

}

.progress .progress-bar.active {
  width: 100%;
  font-weight: 700;
  animation: progress-bar-stripes .5s linear infinite;
}
  
.dotdotdot:after {
  font-weight: 300;
  content: '...';
  display: inline-block;
  width: 20px;
  text-align: left;
  animation: dotdotdot 1.5s linear infinite;
}

@keyframes dotdotdot {
  0% {
    content: '...';
  }
  25% {
    content: '';
  }
  50% {
    content: '.';
  }
  75% {
    content: '..';
  }
}
</style>
