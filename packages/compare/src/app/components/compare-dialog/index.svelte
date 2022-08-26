<Dialog bind:open="{opened}"
        fullscreen
        class="compare-dialog">
  <Header>
    <Title>Baseline</Title>
    <IconButton action="close"
                title="Закрыть"
                class="material-icons">
      close
    </IconButton>
  </Header>

  <Content>
    <div bind:this={imageComparisonElem}
         class="image-compare">
      <img src="{before}" alt="before" />
      <img src="{after}" alt="after" />
    </div>
  </Content>
</Dialog>

<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog, { Header, Title, Content } from '@smui/dialog';
  import IconButton from '@smui/icon-button';
  import ImageCompareViewer from 'image-compare-viewer';
  import 'image-compare-viewer/dist/image-compare-viewer.min.css';

  export let opened = false;
  export let before: string;
  export let after: string;

  let imageComparisonElem: HTMLElement;

  onMount(() => {
    new ImageCompareViewer(imageComparisonElem, {
      controlColor: 'black',
      showLabels: true,
      labelOptions: {
        before: 'Baseline',
        after: 'Actual'
      },
      fluidMode: true,
      smoothing: false
    }).mount();
  });
</script>

<style lang="scss">
  :global {
    .compare-dialog {
      .icv__wrapper,
      .icv__fluidwrapper {
        background-size: contain;
        background-position: left top;
        background-repeat: no-repeat;
      }
    }
  }

  .image-compare {
    width: 100%;
    height: 100%;
  }
</style>
