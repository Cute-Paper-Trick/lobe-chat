import { Suspense } from 'react';
import { Flexbox } from 'react-layout-kit';

import { isDesktop } from '@/const/version';
import InitClientDB from '@/features/InitClientDB';
import ProtocolUrlHandler from '@/features/ProtocolUrlHandler';

import { LayoutProps } from '../type';
import RegisterHotkeys from './RegisterHotkeys';
// import SessionPanel from './SessionPanel';
import TopicPanel from './TopicPanel';
import Workspace from './Workspace';

const Layout = ({ children, topic }: LayoutProps) => {
  return (
    <>
      <Flexbox
        height={'100%'}
        horizontal
        style={{ maxWidth: '100%', overflow: 'hidden', position: 'relative' }}
        width={'100%'}
      >
        {/* <SessionPanel>{session}</SessionPanel> */}
        <TopicPanel>{topic}</TopicPanel>
        <Workspace>{children}</Workspace>
      </Flexbox>
      {!isDesktop && <InitClientDB bottom={60} />}
      {/* ↓ cloud slot ↓ */}

      {/* ↑ cloud slot ↑ */}
      <Suspense>
        <RegisterHotkeys />
      </Suspense>
      {isDesktop && <ProtocolUrlHandler />}
    </>
  );
};

Layout.displayName = 'DesktopChatLayout';

export default Layout;
