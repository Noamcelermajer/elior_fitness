import React from 'react';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { useSearchParams } from 'react-router-dom';

const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const progressEntryId = searchParams.get('progressEntryId');

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] overflow-hidden flex flex-col">
        <Chat
          selectedClientId={clientId ? parseInt(clientId) : null}
          progressEntryId={progressEntryId ? parseInt(progressEntryId) : null}
        />
      </div>
    </Layout>
  );
};

export default ChatPage;

