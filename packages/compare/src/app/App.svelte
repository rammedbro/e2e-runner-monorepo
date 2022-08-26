<TopAppBar variant="fixed"
           color="secondary"
           class="top-app-bar">
  <InnerGrid class="top-app-bar-grid">
    <Cell align="middle"
          spanDevices="{{ mobile: 4, tablet: 3, desktop: 3 }}">
      <h1>Comparison</h1>
    </Cell>

    <Cell align="middle"
          spanDevices="{{ mobile: 4, tablet: 5, desktop: 4 }}">
      <SegmentedButton let:segment
                       bind:selected={statusFilterSelected}
                       segments={statusFilterChoices}
                       key={getSegmentValueKey}
                       singleSelect
                       class="status-filter">
        <Segment {segment}>
          <Label>{segment.label} {segment.count}</Label>
        </Segment>
      </SegmentedButton>
    </Cell>

    <Cell align="middle"
          spanDevices="{{ mobile: 4, tablet: 8, desktop: 5 }}">
      <Textfield bind:value={searchQuery}
                 variant="filled"
                 label="Введите поисковый запрос"
                 style="width: 100%">
        <Icon class="material-icons" slot="leadingIcon">search</Icon>
      </Textfield>
    </Cell>
  </InnerGrid>
</TopAppBar>

<main class="main">
  <Accordion multiple>
    {#each testsFiltered as test (test)}
      <div in:fly out:fly>
        <CompareAccordionPanel {...test} />
      </div>
    {/each}
  </Accordion>
</main>

<script lang="ts">
  import { fly } from 'svelte/transition';
  import TopAppBar from '@smui/top-app-bar';
  import { InnerGrid, Cell } from '@smui/layout-grid';
  import Textfield from '@smui/textfield';
  import Icon from '@smui/textfield/icon';
  import Accordion from '@smui-extra/accordion';
  import SegmentedButton, { Segment, Label } from '@smui/segmented-button';

  import CompareAccordionPanel from '~/src/app/components/compare-accordion-panel/index.svelte';

  export let tests: ITestData[] = [];

  interface IStatusFilterChoice {
    value: string;
    label: string;
    count: number;
  }

  const statusFilterChoices: IStatusFilterChoice[] = [
    { value: 'all', label: 'All', count: tests.length },
    { value: 'passed', label: 'Passed', count: calcTestWithStatusCount('passed') },
    { value: 'broken', label: 'Broken', count: calcTestWithStatusCount('broken') },
    { value: 'failed', label: 'Failed', count: calcTestWithStatusCount('failed') }
  ];
  let statusFilterSelected: IStatusFilterChoice = statusFilterChoices[0];
  let searchQuery = '';

  $: testsFiltered = tests.filter(item => (
    statusFilterSelected === statusFilterChoices[0] ||
    item.status === statusFilterSelected.value
  ) && (
    !searchQuery ||
    item.session.includes(searchQuery) ||
    item.title.includes(searchQuery)
  ));

  function getSegmentValueKey(segment: IStatusFilterChoice): string {
    return segment.value;
  }

  function calcTestWithStatusCount(status: string): number {
    return tests.reduce((sum, item) => item.status === status ? sum + 1 : sum, 0);
  }
</script>

<style lang="scss">
  :global {
    @import './assets/styles/variables.scss';
    @import './assets/styles/global.scss';

    .top-app-bar-grid {
      padding: 16px;
    }

    .status-filter {
      background: var(--mdc-theme-background);

      .mdc-segmented-button__segment {
        font-size: 10px;
        letter-spacing: normal;
      }
    }
  }

  .main {
    padding: 16px;
    padding-top: calc(193px + 16px);
  }

  @media (min-width: 425px) {
    :global {
      .status-filter {
        .mdc-segmented-button__segment {
          font-size: 14px;
        }
      }
    }
  }

  @media (min-width: 960px) {
    :global {
      .top-app-bar-grid {
        width: 100%;
        max-width: 1240px;
        margin: 0 auto;
      }
    }

    .main {
      max-width: 1240px;
      margin: 0 auto;
      padding-top: calc(88px + 16px);
    }
  }
</style>
