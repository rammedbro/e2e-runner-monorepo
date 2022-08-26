<Panel bind:open={isPanelOpened}
       data-status="{status}"
       class="compare-image-accordion-panel">
  <Header>
    <InnerGrid>
      <Cell align="middle"
            spanDevices="{{ phone: 2, tablet: 6, desktop: 10 }}">
        <span class="text--overflow">{session}: {title}</span>
      </Cell>

      <Cell align="middle"
            span="2"
            class="ml-auto">
        <IconButton disabled="{!isComparable}"
                    on:click={openDialog}>
          <Icon title="Сравнить" class="material-icons">compare</Icon>
        </IconButton>

        <IconButton toggle pressed={isPanelOpened}>
          <Icon title="Закрыть" class="material-icons" on>expand_less</Icon>
          <Icon title="Открыть" class="material-icons">expand_more</Icon>
        </IconButton>
      </Cell>
    </InnerGrid>
  </Header>

  <Content>
    <ImageList>
      {#each images as [title, src]}
        <Item>
          <CompareImageCard {title} {src} />
        </Item>
      {/each}
    </ImageList>
  </Content>
</Panel>

<CompareDialog bind:opened="{isDialogOpened}"
               before="{baseline}"
               after="{actual}" />

<script lang="ts">
  import { Panel, Header, Content } from '@smui-extra/accordion';
  import { InnerGrid, Cell } from '@smui/layout-grid';
  import IconButton, { Icon } from '@smui/icon-button';
  import ImageList, { Item } from '@smui/image-list';

  import CompareImageCard from '~/src/app/components/compare-image-card/index.svelte';
  import CompareDialog from '~/src/app/components/compare-dialog/index.svelte';

  export let title: string;
  export let session: string;
  export let status: string;
  export let actual: string;
  export let baseline: string | undefined;
  export let diff: string | undefined;

  const images = Object
    .entries({ actual, baseline, diff })
    .filter(([, src]) => Boolean(src));
  const isComparable = status !== 'broken';
  let isDialogOpened = false;
  let isPanelOpened = true;

  function openDialog(event: MouseEvent) {
    event.stopPropagation();
    isDialogOpened = true;
  }
</script>

<style lang="scss" global>
  @use '@material/image-list/index' as image-list;

  .compare-image-accordion-panel {
    overflow: hidden;

    .smui-accordion__header__title {
      border-left: 10px solid;
    }

    .smui-paper__content {
      .mdc-image-list {
        @include image-list.standard-columns(1);
        @include image-list.shape-radius(4px);
      }
    }

    &[data-status="passed"] {
      .smui-accordion__header__title {
        border-color: var(--mdc-theme-success);
      }
    }

    &[data-status="broken"] {
      .smui-accordion__header__title {
        border-color: var(--mdc-theme-warning);
      }
    }

    &[data-status="failed"] {
      .smui-accordion__header__title {
        border-color: var(--mdc-theme-error);
      }
    }
  }

  @media (min-width: 960px) {
    .compare-image-accordion-panel {
      .smui-paper__content {
        .mdc-image-list {
          @include image-list.standard-columns(3);
        }
      }
    }
  }
</style>
