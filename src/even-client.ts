import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk';

import type { PrayerConfig, PrayerNeed, ViewName } from './types';
import {
  appendEventLog,
  clamp,
  loadConfigFromLocalStorage,
  setStatus,
} from './utils';
import { fetchTodayNeeds, markNeedPrayed } from './api';

type UiState = {
  view: ViewName;
  needs: PrayerNeed[];
  selectedIndex: number;
};

export class EvenPrayerClient {
  private bridge: EvenAppBridge;
  private isStartupCreated = false;
  private ui: UiState = {
    view: 'main-menu',
    needs: [],
    selectedIndex: 0,
  };

  constructor(bridge: EvenAppBridge) {
    this.bridge = bridge;
  }

  async init(): Promise<void> {
    await this.ensureStartupUi();
    await this.renderMainMenu();

    this.bridge.onEvenHubEvent((event) => {
      void this.onEvenHubEvent(event);
    });

    setStatus('Even Prayer connected. Use glasses to navigate menu.');
  }

  private getConfig(): PrayerConfig {
    const cfg = loadConfigFromLocalStorage();
    return {
      apiEmail: cfg.apiEmail,
      apiPassword: cfg.apiPassword,
    };
  }

  private async ensureStartupUi(): Promise<void> {
    if (this.isStartupCreated) return;

    const title = new TextContainerProperty({
      containerID: 1,
      containerName: 'title',
      xPosition: 0,
      yPosition: 40,
      width: 576,
      height: 40,
      content: 'EvenPrayer',
      isEventCapture: 0,
    });

    const hint = new TextContainerProperty({
      containerID: 2,
      containerName: 'hint',
      xPosition: 0,
      yPosition: 120,
      width: 576,
      height: 40,
      content: 'Tap to open main menu',
      isEventCapture: 1,
    });

    const result = await this.bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 2,
        textObject: [title, hint],
      }),
    );

    if (result === 0) {
      this.isStartupCreated = true;
    } else {
      appendEventLog(`Failed to create startup page: code=${result}`);
    }
  }

  private async showTextFullScreen(content: string, captureEvents = true): Promise<void> {
    await this.bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 1,
        textObject: [
          new TextContainerProperty({
            containerID: 10,
            containerName: 'body',
            xPosition: 0,
            yPosition: 0,
            width: 576,
            height: 288,
            content,
            isEventCapture: captureEvents ? 1 : 0,
          }),
        ],
      }),
    );
  }

  private async renderMainMenu(): Promise<void> {
    this.ui.view = 'main-menu';
    const items = ['Today Needs'];

    const list = new ListContainerProperty({
      containerID: 100,
      containerName: 'main-menu',
      xPosition: 0,
      yPosition: 80,
      width: 576,
      height: 176,
      borderWidth: 1,
      borderColor: 5,
      borderRdaius: 6,
      paddingLength: 4,
      isEventCapture: 1,
      itemContainer: new ListItemContainerProperty({
        itemCount: items.length,
        itemWidth: 560,
        isItemSelectBorderEn: 1,
        itemName: items,
      }),
    });

    await this.bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 4,
        textObject: [
          new TextContainerProperty({
            containerID: 90,
            containerName: 'main-menu-title',
            xPosition: 0,
            yPosition: 10,
            width: 576,
            height: 32,
            content: 'EvenPublisher',
            isEventCapture: 0,
          }),
          new TextContainerProperty({
            containerID: 91,
            containerName: 'main-menu-subtitle',
            xPosition: 0,
            yPosition: 42,
            width: 576,
            height: 24,
            content: 'by Ivan Vlaevski v.1.0',
            isEventCapture: 0,
          }),
          new TextContainerProperty({
            containerID: 92,
            containerName: 'main-menu-footer',
            xPosition: 260,
            yPosition: 260,
            width: 316,
            height: 24,
            content: 'Revolute to @ivanvlaevski',
            isEventCapture: 0,
          }),
        ],
        listObject: [list],
      }),
    );

    setStatus('Main menu: tap to open Today Needs.');
  }

  private async loadNeedsAndOpen(): Promise<void> {
    const config = this.getConfig();
    if (!config.apiEmail || !config.apiPassword) {
      await this.showTextFullScreen(
        'API credentials missing.\n\nSet email and password on the phone screen, then try again.',
      );
      this.ui.view = 'error';
      return;
    }

    await this.showTextFullScreen('Loading today needs…');

    try {
      this.ui.needs = await fetchTodayNeeds(config);
      this.ui.selectedIndex = 0;
      if (!this.ui.needs.length) {
        await this.showTextFullScreen('No needs for today.\n\nTap to return to main menu.');
        this.ui.view = 'error';
        return;
      }
      await this.renderNeedDetail();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.showTextFullScreen(`Failed to load needs.\n\n${message}\n\nTap to return.`);
      this.ui.view = 'error';
    }
  }

  private getCurrentNeed(): PrayerNeed | null {
    if (!this.ui.needs.length) return null;
    const index = clamp(this.ui.selectedIndex, 0, this.ui.needs.length - 1);
    return this.ui.needs[index] ?? null;
  }

  private async renderNeedDetail(): Promise<void> {
    this.ui.view = 'needs-detail';
    const need = this.getCurrentNeed();
    if (!need) {
      await this.renderMainMenu();
      return;
    }

    const total = this.ui.needs.length;
    const indexLabel = `[${this.ui.selectedIndex + 1} of ${total}]`;
    const owner = need.profile.name || 'Unknown';
    const footer = `Scroll to change needs. Tap to mark "Prayed (${need.prayedCount})"`;

    await this.bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 4,
        textObject: [
          // header left: index
          new TextContainerProperty({
            containerID: 200,
            containerName: 'needs-header-index',
            xPosition: 0,
            yPosition: 0,
            width: 200,
            height: 32,
            content: indexLabel,
            isEventCapture: 0,
          }),
          // header right: owner
          new TextContainerProperty({
            containerID: 201,
            containerName: 'needs-header-owner',
            xPosition: 200,
            yPosition: 0,
            width: 376,
            height: 32,
            content: owner,
            isEventCapture: 0,
          }),
          // body: need text
          new TextContainerProperty({
            containerID: 210,
            containerName: 'needs-body',
            xPosition: 0,
            yPosition: 32,
            width: 576,
            height: 224,
            content: need.description,
            isEventCapture: 1,
          }),
          // footer
          new TextContainerProperty({
            containerID: 220,
            containerName: 'needs-footer',
            xPosition: 0,
            yPosition: 256,
            width: 576,
            height: 32,
            content: footer,
            isEventCapture: 0,
          }),
        ],
      }),
    );

    setStatus('Today needs: scroll to change, tap to mark prayed.');
  }

  private async handleMainMenuSelect(index: number): Promise<void> {
    if (index === 0) {
      await this.loadNeedsAndOpen();
    }
  }

  private async onEvenHubEvent(event: EvenHubEvent): Promise<void> {
    if (!event.textEvent && !event.listEvent && !event.sysEvent) {
      return;
    }

    const eventType =
      event.textEvent?.eventType ??
      event.sysEvent?.eventType ??
      event.listEvent?.eventType ??
      undefined;

    if (event.listEvent && event.listEvent.containerName === 'main-menu') {
      if (
        eventType === OsEventTypeList.CLICK_EVENT ||
        eventType === undefined
      ) {
        const idx = event.listEvent.currentSelectItemIndex ?? 0;
        await this.handleMainMenuSelect(idx);
      }
      return;
    }

    if (this.ui.view === 'needs-detail') {
      if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
        if (this.ui.needs.length > 0) {
          this.ui.selectedIndex =
            (this.ui.selectedIndex + 1) % this.ui.needs.length;
        }
        await this.renderNeedDetail();
        return;
      }

      if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
        if (this.ui.needs.length > 0) {
          this.ui.selectedIndex =
            (this.ui.selectedIndex - 1 + this.ui.needs.length) %
            this.ui.needs.length;
        }
        await this.renderNeedDetail();
        return;
      }

      if (eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined) {
        const need = this.getCurrentNeed();
        if (!need) return;
        const config = this.getConfig();
        if (!config.apiEmail || !config.apiPassword) {
          await this.showTextFullScreen(
            'API credentials missing.\n\nSet email and password on the phone screen, then try again.',
          );
          this.ui.view = 'error';
          return;
        }
        try {
          await markNeedPrayed(config, need);
          need.prayedCount += 1;
          await this.renderNeedDetail();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await this.showTextFullScreen(
            `Failed to mark as prayed.\n\n${message}\n\nTap to continue.`,
          );
          this.ui.view = 'error';
        }
        return;
      }

      if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
        await this.renderMainMenu();
        return;
      }
    }

    if (this.ui.view === 'error') {
      if (eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined) {
        await this.renderMainMenu();
      }
    }
  }
}

