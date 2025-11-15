import React, { useEffect } from 'react';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { useSearchParams } from 'react-router-dom';

const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const progressEntryId = searchParams.get('progressEntryId');

  useEffect(() => {
    // Prevent body scroll on mobile when chat is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-4rem-64px)] md:h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] overflow-hidden flex flex-col">
        <Chat
          selectedClientId={clientId ? parseInt(clientId) : null}
          progressEntryId={progressEntryId ? parseInt(progressEntryId) : null}
        />
      </div>
    </Layout>
  );
};

export default ChatPage;

