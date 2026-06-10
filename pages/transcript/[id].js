import { createClient } from '@supabase/supabase-js';

export async function getServerSideProps({ params }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', params.id)
    .single();

  return { props: { record: data || null } };
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function userLine(author) {
  if (!author) return 'Unknown User';
  const name = author.tag || author.username || 'Unknown User';
  return `${name} (${author.id || 'Unknown ID'})`;
}

function isImageAttachment(attachment) {
  const type = attachment?.contentType || '';
  const url = attachment?.url || '';
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(url);
}

export default function Transcript({ record }) {
  if (!record) {
    return (
      <main className="notFound">
        <h1>Transcript not found</h1>
        <p>This transcript either does not exist or is no longer available.</p>
        <style jsx>{`
          .notFound {
            min-height: 100vh;
            background: #313338;
            color: #f2f3f5;
            font-family: Arial, sans-serif;
            padding: 48px;
          }
          p { color: #b5bac1; }
        `}</style>
      </main>
    );
  }

  const t = record.transcript || {};
  const messages = Array.isArray(t.messages) ? t.messages : [];
  const openedDate = t.createdAt ? new Date(t.createdAt) : record.created_at ? new Date(record.created_at) : null;
  const closeDate = t.closedAt ? new Date(t.closedAt) : null;

  return (
    <main className="page">
      <aside className="sidebar">
        <div className="serverIcon">NY</div>
      </aside>

      <section className="app">
        <header className="channelHeader">
          <div>
            <div className="channelName"># {t.channelName || record.ticket_name || 'ticket-transcript'}</div>
            <div className="channelSub">Ticket transcript • {messages.length} messages</div>
          </div>
        </header>

        <section className="ticketInfo">
          <h1>{record.ticket_name || t.channelName || 'Ticket Transcript'}</h1>
          <div className="infoGrid">
            <div><span>Ticket Category</span>{t.ticketCategory || t.ticketType || 'Unknown'}</div>
            <div><span>Discord ID</span>{t.ticketOwnerId || 'Unknown'}</div>
            <div><span>Roblox Username</span>{t.roblox || 'Unknown'}</div>
            <div><span>Opened</span>{openedDate ? formatDate(openedDate) : 'Unknown'}</div>
            <div><span>Closed</span>{closeDate ? formatDate(closeDate) : 'Unknown'}</div>
            <div><span>Closed By</span>{t.closedBy ? t.closedBy : 'Unknown'}</div>
            <div className="wide"><span>Ticket Open Reason</span>{t.inquiry || 'Unknown'}</div>
            <div className="wide"><span>Close Reason</span>{t.closeReason || t.close_reason || 'No close reason provided'}</div>
          </div>
        </section>

        <section className="messages">
          {messages.map((message) => (
            <article className="message" key={message.id}>
              <img
                className="avatar"
                src={message.author?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt=""
              />
              <div className="messageBody">
                <div className="messageMeta">
                  <span className="username">{message.author?.username || message.author?.tag || 'Unknown User'}</span>
                  {message.author?.bot && <span className="botTag">BOT</span>}
                  <span className="userId">({message.author?.id || 'Unknown ID'})</span>
                  <time>{formatDate(message.createdAt || message.createdTimestamp)}</time>
                </div>

                {message.content && <div className="content">{message.content}</div>}

                {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                  <div className="attachments">
                    {message.attachments.map((attachment, index) => (
                      <div className="attachment" key={`${message.id}-attachment-${index}`}>
                        {isImageAttachment(attachment) ? (
                          <a href={attachment.url} target="_blank" rel="noreferrer">
                            <img src={attachment.url} alt={attachment.name || 'attachment'} />
                          </a>
                        ) : (
                          <a href={attachment.url} target="_blank" rel="noreferrer">
                            📎 {attachment.name || 'Attachment'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {Array.isArray(message.embeds) && message.embeds.length > 0 && (
                  <div className="embeds">
                    {message.embeds.map((embed, index) => (
                      <div className="embed" key={`${message.id}-embed-${index}`}>
                        {embed.title && <div className="embedTitle">{embed.title}</div>}
                        {embed.description && <div className="embedDescription">{embed.description}</div>}
                        {Array.isArray(embed.fields) && embed.fields.map((field, fieldIndex) => (
                          <div className="embedField" key={fieldIndex}>
                            <b>{field.name}</b>
                            <p>{field.value}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {!message.content && (!message.attachments || message.attachments.length === 0) && (!message.embeds || message.embeds.length === 0) && (
                  <div className="content muted">No text content</div>
                )}
              </div>
            </article>
          ))}
        </section>
      </section>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: #313338;
        }

        .page {
          min-height: 100vh;
          background: #313338;
          color: #dbdee1;
          display: flex;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sidebar {
          width: 72px;
          background: #1e1f22;
          display: flex;
          justify-content: center;
          padding-top: 16px;
          flex-shrink: 0;
        }

        .serverIcon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #5865f2;
          color: white;
          display: grid;
          place-items: center;
          font-weight: 800;
        }

        .app {
          flex: 1;
          min-width: 0;
        }

        .channelHeader {
          height: 58px;
          border-bottom: 1px solid #1f2023;
          background: #313338;
          display: flex;
          align-items: center;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .channelName {
          font-size: 18px;
          font-weight: 700;
          color: #f2f3f5;
        }

        .channelSub {
          font-size: 12px;
          color: #949ba4;
          margin-top: 2px;
        }

        .ticketInfo {
          margin: 24px;
          background: #2b2d31;
          border: 1px solid #3f4147;
          border-radius: 10px;
          padding: 22px;
        }

        .ticketInfo h1 {
          margin: 0 0 18px;
          color: #f2f3f5;
          font-size: 28px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: 14px;
        }

        .infoGrid div {
          background: #313338;
          border-radius: 8px;
          padding: 12px;
          color: #dbdee1;
          word-break: break-word;
        }

        .infoGrid .wide {
          grid-column: span 3;
        }

        .infoGrid span {
          display: block;
          color: #949ba4;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
          margin-bottom: 6px;
          font-weight: 700;
        }

        .messages {
          padding: 0 0 40px;
        }

        .message {
          display: flex;
          gap: 16px;
          padding: 8px 24px;
        }

        .message:hover {
          background: #2e3035;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .messageBody {
          min-width: 0;
          flex: 1;
        }

        .messageMeta {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          min-height: 22px;
        }

        .username {
          color: #f2f3f5;
          font-weight: 700;
          font-size: 16px;
        }

        .botTag {
          background: #5865f2;
          color: #fff;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 4px;
        }

        .userId {
          color: #b5bac1;
          font-size: 14px;
        }

        time {
          color: #949ba4;
          font-size: 13px;
        }

        .content {
          color: #dbdee1;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.42;
          font-size: 15px;
        }

        .muted {
          color: #949ba4;
          font-style: italic;
        }

        .attachments {
          margin-top: 8px;
          display: grid;
          gap: 8px;
        }

        .attachment img {
          max-width: 420px;
          max-height: 320px;
          border-radius: 8px;
          border: 1px solid #3f4147;
        }

        .attachment a {
          color: #00a8fc;
          text-decoration: none;
        }

        .embeds {
          margin-top: 8px;
          display: grid;
          gap: 8px;
        }

        .embed {
          border-left: 4px solid #5865f2;
          background: #2b2d31;
          border-radius: 4px;
          padding: 10px 12px;
          max-width: 560px;
        }

        .embedTitle {
          color: #f2f3f5;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .embedDescription,
        .embedField p {
          color: #dbdee1;
          margin: 0;
          white-space: pre-wrap;
        }

        .embedField {
          margin-top: 8px;
        }

        .embedField b {
          color: #f2f3f5;
        }

        @media (max-width: 800px) {
          .sidebar {
            display: none;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }

          .infoGrid .wide {
            grid-column: span 1;
          }

          .ticketInfo {
            margin: 12px;
          }

          .message {
            padding: 8px 12px;
          }

          .attachment img {
            max-width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
