'use client';

import { DraggablePanel, DraggablePanelContainer, type DraggablePanelProps } from '@lobehub/ui';
import { createStyles, useResponsive, useThemeMode } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { PropsWithChildren, memo, useEffect, useMemo, useState } from 'react';

import { withSuspense } from '@/components/withSuspense';
import { FOLDER_WIDTH } from '@/const/layoutTokens';
import { usePinnedAgentState } from '@/hooks/usePinnedAgentState';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';

import { TOOGLE_PANEL_BUTTON_ID } from '../../features/TogglePanelButton';

export const useStyles = createStyles(({ css, token }) => ({
  panel: css`
    height: 100%;
    color: ${token.colorTextSecondary};
    background: ${token.colorBgLayout};

    #${TOOGLE_PANEL_BUTTON_ID} {
      opacity: 0;
      transition: opacity 0.15s ${token.motionEaseInOut};
    }

    &:hover {
      #${TOOGLE_PANEL_BUTTON_ID} {
        opacity: 1;
      }
    }
  `,
}));

const TopicPanel = memo<PropsWithChildren>(({ children }) => {
  const { md = true } = useResponsive();

  const [isPinned] = usePinnedAgentState();

  const { styles } = useStyles();
  const [topicWidth, topicExpandable, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.topicWidth(s),
    systemStatusSelectors.showTopicPanel(s),
    s.updateSystemStatus,
  ]);

  const [cacheExpand, setCacheExpand] = useState<boolean>(Boolean(topicExpandable));
  const [tmpWidth, setWidth] = useState(topicWidth);
  if (tmpWidth !== topicWidth) setWidth(topicWidth);

  const handleExpand = (expand: boolean) => {
    if (isEqual(expand, topicExpandable)) return;
    updatePreference({ showTopicPanel: expand });
    setCacheExpand(expand);
  };

  const handleSizeChange: DraggablePanelProps['onSizeChange'] = (_, size) => {
    if (!size) return;
    const nextWidth = typeof size.width === 'string' ? Number.parseInt(size.width) : size.width;
    if (!nextWidth) return;

    if (isEqual(nextWidth, topicWidth)) return;
    setWidth(nextWidth);
    updatePreference({ topicWidth: nextWidth });
  };

  useEffect(() => {
    if (md && cacheExpand) updatePreference({ showTopicPanel: true });
    if (!md) updatePreference({ showTopicPanel: false });
  }, [md, cacheExpand]);

  const { appearance } = useThemeMode();

  const TopicPanel = useMemo(() => {
    return (
      <DraggablePanel
        className={styles.panel}
        defaultSize={{ width: tmpWidth }}
        // 当进入 pin 模式下，不可展开
        expand={!isPinned && topicExpandable}
        expandable={!isPinned}
        maxWidth={400}
        minWidth={FOLDER_WIDTH}
        mode={md ? 'fixed' : 'float'}
        onExpandChange={handleExpand}
        onSizeChange={handleSizeChange}
        placement="left"
        size={{ height: '100%', width: topicWidth }}
      >
        <DraggablePanelContainer style={{ flex: 'none', height: '100%', minWidth: FOLDER_WIDTH }}>
          {children}
        </DraggablePanelContainer>
      </DraggablePanel>
    );
  }, [topicWidth, md, isPinned, topicExpandable, tmpWidth, appearance]);

  return TopicPanel;
});

export default withSuspense(TopicPanel);
