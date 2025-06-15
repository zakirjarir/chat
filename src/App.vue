<template>
  <div>
    <router-view></router-view>
    <CallListener />
  </div>
</template>


<script>

import CallListener from "@/components/CallListener.vue";

export default {
  name: 'App',
  components: {CallListener},
}
</script>

<style>

</style>
