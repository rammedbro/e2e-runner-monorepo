<Card variant="outlined"
      class="compare-image-card">
  <div class="compare-image-card__content">
    <ImageAspectContainer on:click={toggleDialog}>
      <Image {src}
             alt="{title}" />
    </ImageAspectContainer>
  </div>

  <Supporting class="compare-image-card__supporting">
    <Label>{title}</Label>
  </Supporting>

  <Dialog bind:open={dialogOpened}
          fullscreen
          class="compare-image-card__dialog">
    <Header>
      <Title>{title}</Title>
      <IconButton action="close"
                  title="Закрыть"
                  class="material-icons">
        close
      </IconButton>
    </Header>

    <Content>
      <Image {src} alt="{title}" />
    </Content>
  </Dialog>
</Card>

<script lang="ts">
  import { ImageAspectContainer, Image, Supporting, Label } from '@smui/image-list';
  import Card from '@smui/card';
  import Dialog, { Header, Title, Content } from '@smui/dialog';
  import IconButton from '@smui/icon-button';

  export let title: string;
  export let src: string;

  let dialogOpened = false;

  function toggleDialog() {
    dialogOpened = !dialogOpened;
  }
</script>

<style lang="scss" global>
  .compare-image-card {
    background-color: #aaa;

    .compare-image-card__content {
      .mdc-image-list__image {
        object-fit: contain;
        cursor: pointer;
      }
    }

    .compare-image-card__supporting {
      background-color: rgba(0, 0, 0, .6);
      color: white;
      padding: 16px;
      border-bottom-right-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    .compare-image-card__dialog {
      .mdc-image-list__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: left top;
      }
    }
  }
</style>
