import App from '~/src/app/App.svelte';

export default new App({
  target: document.body,
  props: {
    tests: __TESTS__
  }
});
