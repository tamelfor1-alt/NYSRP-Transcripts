import { createClient } from '@supabase/supabase-js';

const SERVER_ICON = 'https://media.discordapp.net/stickers/1492528160577814681.webp?size=160&quality=lossless';

export async function getServerSideProps({ params }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return { props: { record: null } };

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

function displayNameFromAuthor(author) {
  if (!author) return 'Unknown';
  return author.username || author.tag || 'Unknown';
}

function attachmentDisplayUrl(attachment) {
  return attachment?.dataUrl || attachment?.proxyUrl || attachment?.proxy_url || attachment?.url || '';
}

function isImageAttachment(attachment) {
  const type = attachment?.contentType || attachment?.content_type || '';
  const url = attachmentDisplayUrl(attachment);
  const name = attachment?.name || attachment?.filename || '';
  return type.startsWith('image/') || url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url) || /\.(png|jpe?g|gif|webp)$/i.test(name);
}

function buildUserMap(messages) {
  const map = {};
  for (const message of messages) {
    if (message.author?.id) map[message.author.id] = displayNameFromAuthor(message.author);
  }
  return map;
}

function renderContentWithMentions(content, userMap) {
  if (!content) return null;

  const parts = [];
  const mentionRegex = /<@!?(\d+)>/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const id = match[1];

    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));

    parts.push(
      <span className="mention" key={id + '-' + match.index}>
        @{userMap[id] || 'User'} ({id})
      </span>
    );

    lastIndex = mentionRegex.lastIndex;
  }

  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
}

function componentTextExists(components) {
  if (!Array.isArray(components)) return false;

  return components.some(component => {
    if (!component) return false;
    if (typeof component.content === 'string' && component.content.trim()) return true;
    if (component.label || component.url || component.custom_id) return true;
    if (component.media?.url || component.file?.url) return true;
    if (Array.isArray(component.items) && component.items.length > 0) return true;
    if (Array.isArray(component.options) && component.options.length > 0) return true;
    return componentTextExists(component.components);
  });
}

function renderDiscordMarkdown(content, userMap) {
  if (!content) return null;

  return String(content).split('\n').map((line, index) => {
    if (line.trim() === '_ _') return <div className="cv2Spacer" key={`space-${index}`} />;

    let className = 'cv2Line';
    let text = line;

    if (line.startsWith('## ')) {
      className = 'cv2Heading';
      text = line.slice(3);
    } else if (line.startsWith('# ')) {
      className = 'cv2HeadingLarge';
      text = line.slice(2);
    } else if (line.startsWith('-# ')) {
      className = 'cv2Small';
      text = line.slice(3);
    }

    const pieces = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let last = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > last) pieces.push(renderContentWithMentions(text.slice(last, match.index), userMap));
      pieces.push(<strong key={`bold-${index}-${match.index}`}>{renderContentWithMentions(match[1], userMap)}</strong>);
      last = boldRegex.lastIndex;
    }

    if (last < text.length) pieces.push(renderContentWithMentions(text.slice(last), userMap));

    return <div className={className} key={`line-${index}`}>{pieces.length ? pieces : ' '}</div>;
  });
}

function getEmojiText(emoji) {
  if (!emoji) return '';
  if (emoji.name && !emoji.id) return `${emoji.name} `;
  return '';
}

function renderComponent(component, userMap, key) {
  if (!component) return null;

  if (component.type === 17) {
    return (
      <div
        className="cv2Card"
        key={key}
        style={{
          borderLeftColor: component.accent_color
            ? `#${Number(component.accent_color).toString(16).padStart(6, '0')}`
            : undefined
        }}
      >
        {Array.isArray(component.components) &&
          component.components.map((child, index) => renderComponent(child, userMap, `${key}-container-${index}`))}
      </div>
    );
  }

  if (component.type === 9) {
    return (
      <div className="cv2Section" key={key}>
        <div className="cv2SectionText">
          {Array.isArray(component.components) &&
            component.components.map((child, index) => renderComponent(child, userMap, `${key}-section-${index}`))}
        </div>
        {component.accessory && <div className="cv2Accessory">{renderComponent(component.accessory, userMap, `${key}-accessory`)}</div>}
      </div>
    );
  }

  if (component.type === 10 && component.content) {
    return <div className="cv2Text" key={key}>{renderDiscordMarkdown(component.content, userMap)}</div>;
  }

  if (component.type === 11 && component.media?.url) {
    return <a className="cv2Thumbnail" href={component.media.url} target="_blank" rel="noreferrer" key={key}><img src={component.media.url} alt="thumbnail" /></a>;
  }

  if (component.type === 12 && Array.isArray(component.items)) {
    return (
      <div className="cv2MediaGrid" key={key}>
        {component.items.map((item, index) => {
          const url = item?.media?.url;
          if (!url) return null;
          return <a className="cv2Media" href={url} target="_blank" rel="noreferrer" key={`${key}-media-${index}`}><img src={url} alt={item.description || 'media'} /></a>;
        })}
      </div>
    );
  }

  if (component.type === 13 && component.file?.url) {
    return <a className="cv2File" href={component.file.url} target="_blank" rel="noreferrer" key={key}>📎 {component.file.name || 'File'}</a>;
  }

  if (component.type === 14) {
    const visible = component.divider !== false && component.is_divider !== false;
    const spacing = component.spacing === 2 ? 'large' : 'small';
    return visible ? <div className={`cv2Separator ${spacing}`} key={key} /> : <div className={`cv2Spacer ${spacing}`} key={key} />;
  }

  if (component.type === 1) {
    return (
      <div className="cv2ActionRow" key={key}>
        {Array.isArray(component.components) &&
          component.components.map((child, index) => renderComponent(child, userMap, `${key}-row-${index}`))}
      </div>
    );
  }

  if (component.type === 2) {
    const label = `${getEmojiText(component.emoji)}${component.label || 'Button'}`;
    const styleClass =
      component.style === 1 ? 'primaryButton' :
      component.style === 3 ? 'successButton' :
      component.style === 4 ? 'dangerButton' :
      component.style === 5 ? 'linkButton' :
      'secondaryButton';

    if (component.style === 5 && component.url) {
      return <a className={`cv2Button ${styleClass}`} href={component.url} target="_blank" rel="noreferrer" key={key}>{label}</a>;
    }

    return <span className={`cv2Button ${styleClass}`} key={key}>{label}</span>;
  }

  if ([3, 5, 6, 7, 8].includes(component.type)) {
    return (
      <div className="cv2Select" key={key}>
        <div className="cv2SelectPlaceholder">{component.placeholder || 'Select Menu'}</div>
        {Array.isArray(component.options) && component.options.length > 0 && (
          <div className="cv2SelectOptions">
            {component.options.map((option, index) => (
              <span className="cv2SelectOption" key={`${key}-option-${index}`}>{option.label || option.value}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (Array.isArray(component.components)) {
    return <div className="cv2Nested" key={key}>{component.components.map((child, index) => renderComponent(child, userMap, `${key}-nested-${index}`))}</div>;
  }

  return null;
}

function renderComponentsV2(components, userMap, messageId) {
  if (!Array.isArray(components) || components.length === 0) return null;
  const hasContainer = components.some(component => component?.type === 17);

  return (
    <div className="componentsV2">
      {hasContainer
        ? components.map((component, index) => renderComponent(component, userMap, `${messageId}-component-${index}`))
        : <div className="cv2Card">{components.map((component, index) => renderComponent(component, userMap, `${messageId}-component-${index}`))}</div>}
    </div>
  );
}

export default function Transcript({ record }) {
  if (!record) {
    return (
      <main className="notFound">
        <h1>Transcript not found</h1>
        <p>This transcript either does not exist or is no longer available.</p>
        <style jsx global>{`
          .notFound { min-height: 100vh; background: #313338; color: #f2f3f5; font-family: Arial, sans-serif; padding: 48px; }
          p { color: #b5bac1; }
        `}</style>
      </main>
    );
  }

  const t = record.transcript || {};
  const messages = Array.isArray(t.messages) ? t.messages : [];
  const userMap = buildUserMap(messages);
  const openedDate = t.createdAt || record.created_at;
  const closeDate = t.closedAt;

  return (
    <main className="page">
      <aside className="sidebar">
        <img className="serverIcon" src={SERVER_ICON} alt="Server icon" />
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
            <div><span>Opened</span>{formatDate(openedDate)}</div>
            <div><span>Closed</span>{formatDate(closeDate)}</div>
            <div><span>Closed By</span>{t.closedBy || 'Unknown'}</div>
            <div className="wide"><span>Ticket Open Reason</span>{t.inquiry || 'Unknown'}</div>
            <div className="wide"><span>Close Reason</span>{t.closeReason || t.close_reason || 'No close reason provided'}</div>
          </div>
        </section>

        <section className="messages">
          {messages.map((message) => {
            const hasComponents = Array.isArray(message.components) && message.components.length > 0;

            return (
              <article className="message" key={message.id}>
                <img className="avatar" src={(message.author && message.author.avatarURL) || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="" />

                <div className="messageBody">
                  <div className="messageMeta">
                    <span className="username">{(message.author && (message.author.username || message.author.tag)) || 'Unknown User'}</span>
                    {message.author && message.author.bot && <span className="botTag">BOT</span>}
                    <span className="userId">({(message.author && message.author.id) || 'Unknown ID'})</span>
                    <time>{formatDate(message.createdAt || message.createdTimestamp)}</time>
                  </div>

                  {message.content && !hasComponents && <div className="content">{renderContentWithMentions(message.content, userMap)}</div>}

                  {hasComponents && renderComponentsV2(message.components, userMap, message.id)}

                  {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                    <div className="attachments">
                      {message.attachments.map((attachment, index) => (
                        <div className="attachment" key={message.id + '-attachment-' + index}>
                          {isImageAttachment(attachment) ? (
                            <a href={attachmentDisplayUrl(attachment)} target="_blank" rel="noreferrer">
                              <img src={attachmentDisplayUrl(attachment)} alt={attachment.name || 'attachment'} />
                            </a>
                          ) : (
                            <a href={attachmentDisplayUrl(attachment)} target="_blank" rel="noreferrer">
                              📎 {attachment.name || attachment.filename || 'Attachment'}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {Array.isArray(message.embeds) && message.embeds.length > 0 && !hasComponents && (
                    <div className="embeds">
                      {message.embeds.map((embed, index) => (
                        <div className="embed" key={message.id + '-embed-' + index}>
                          {embed.title && <div className="embedTitle">{embed.title}</div>}
                          {embed.description && <div className="embedDescription">{renderContentWithMentions(embed.description, userMap)}</div>}
                          {Array.isArray(embed.fields) && embed.fields.map((field, fieldIndex) => (
                            <div className="embedField" key={fieldIndex}><b>{field.name}</b><p>{renderContentWithMentions(field.value, userMap)}</p></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {!message.content &&
                    (!message.attachments || message.attachments.length === 0) &&
                    (!message.embeds || message.embeds.length === 0) &&
                    !componentTextExists(message.components) && (
                      <div className="content muted">No text content</div>
                    )}
                </div>
              </article>
            );
          })}
        </section>
      </section>

      <style jsx global>{`
        :global(body) { margin: 0; background: #313338; }

        .page { min-height: 100vh; background: #313338; color: #dbdee1; display: flex; font-family: Arial, Helvetica, sans-serif; }
        .sidebar { width: 72px; background: #1e1f22; display: flex; justify-content: center; padding-top: 16px; flex-shrink: 0; }
        .serverIcon { width: 48px; height: 48px; border-radius: 16px; object-fit: cover; box-shadow: 0 0 0 2px rgba(255,255,255,.08); }
        .app { flex: 1; min-width: 0; }
        .channelHeader { height: 58px; border-bottom: 1px solid #1f2023; background: #313338; display: flex; align-items: center; padding: 0 24px; position: sticky; top: 0; z-index: 5; }
        .channelName { font-size: 18px; font-weight: 700; color: #f2f3f5; }
        .channelSub { font-size: 12px; color: #949ba4; margin-top: 2px; }

        .ticketInfo { margin: 24px; background: #2b2d31; border: 1px solid #3f4147; border-radius: 10px; padding: 22px; }
        .ticketInfo h1 { margin: 0 0 18px; color: #f2f3f5; font-size: 28px; }
        .infoGrid { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 14px; }
        .infoGrid div { background: #313338; border-radius: 8px; padding: 12px; color: #dbdee1; word-break: break-word; }
        .infoGrid .wide { grid-column: span 3; }
        .infoGrid span { display: block; color: #949ba4; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; font-weight: 700; }

        .messages { padding: 0 0 40px; }
        .message { display: flex; gap: 16px; padding: 8px 24px; }
        .message:hover { background: #2e3035; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
        .messageBody { min-width: 0; flex: 1; }
        .messageMeta { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-height: 22px; margin-bottom: 2px; }
        .username { color: #f2f3f5; font-weight: 700; font-size: 16px; }
        .botTag { background: #5865f2; color: #fff; border-radius: 3px; font-size: 10px; font-weight: 800; padding: 1px 4px; }
        .userId { color: #b5bac1; font-size: 14px; }
        time { color: #949ba4; font-size: 13px; }
        .content { color: #dbdee1; white-space: pre-wrap; word-break: break-word; line-height: 1.42; font-size: 15px; }
        .mention { background: rgba(88,101,242,.3); color: #dee0fc; border-radius: 3px; padding: 0 3px; font-weight: 600; }
        .muted { color: #949ba4; font-style: italic; }

        .attachments { margin-top: 8px; display: grid; gap: 8px; }
        .attachment img { max-width: 420px; max-height: 320px; border-radius: 8px; border: 1px solid #3f4147; }
        .attachment a { color: #00a8fc; text-decoration: none; }

        .embeds { margin-top: 8px; display: grid; gap: 8px; }
        .embed { border-left: 4px solid #5865f2; background: #2b2d31; border-radius: 4px; padding: 10px 12px; max-width: 560px; }
        .embedTitle { color: #f2f3f5; font-weight: 700; margin-bottom: 6px; }
        .embedDescription, .embedField p { color: #dbdee1; margin: 0; white-space: pre-wrap; }
        .embedField { margin-top: 8px; }
        .embedField b { color: #f2f3f5; }

        .componentsV2 { margin-top: 4px; display: grid; gap: 8px; max-width: 680px; }
        .cv2Card { background: #2b2d31; border-left: 4px solid #5865f2; border-radius: 5px; padding: 14px; max-width: 680px; display: grid; gap: 10px; box-sizing: border-box; border-top: 1px solid rgba(255,255,255,.04); border-right: 1px solid rgba(255,255,255,.04); border-bottom: 1px solid rgba(255,255,255,.04); }
        .cv2Section { display: flex; gap: 12px; align-items: flex-start; }
        .cv2SectionText { min-width: 0; flex: 1; display: grid; gap: 6px; }
        .cv2Accessory { flex-shrink: 0; }
        .cv2Text { color: #dbdee1; word-break: break-word; line-height: 1.38; font-size: 15px; }
        .cv2Line { margin: 0 0 2px; }
        .cv2HeadingLarge, .cv2Heading { color: #f2f3f5; font-size: 20px; line-height: 1.25; font-weight: 800; margin: 0 0 10px; }
        .cv2Small { color: #949ba4; font-size: 13px; margin-top: 2px; }
        .cv2Text strong { color: #f2f3f5; font-weight: 800; }
        .cv2Spacer { height: 8px; }
        .cv2Separator { height: 1px; background: #3f4147; margin: 2px 0; }
        .cv2Separator.large { margin: 8px 0; }
        .cv2ActionRow { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 2px; }
        .cv2Button { display: inline-flex; align-items: center; justify-content: center; min-height: 34px; padding: 0 14px; border-radius: 5px; color: #f2f3f5; font-size: 14px; font-weight: 700; text-decoration: none; user-select: none; box-sizing: border-box; }
        .secondaryButton { background: #4e5058; }
        .primaryButton, .linkButton { background: #5865f2; color: #fff; }
        .successButton { background: #248046; color: #fff; }
        .dangerButton { background: #da373c; color: #fff; }
        .cv2Select { max-width: 360px; background: #1e1f22; border: 1px solid #3f4147; border-radius: 4px; padding: 8px 10px; }
        .cv2SelectPlaceholder { color: #b5bac1; font-size: 14px; margin-bottom: 6px; }
        .cv2SelectOptions { display: flex; flex-wrap: wrap; gap: 6px; }
        .cv2SelectOption { display: inline-block; background: #313338; border-radius: 3px; padding: 3px 6px; color: #dbdee1; font-size: 12px; }
        .cv2MediaGrid { display: grid; gap: 8px; }
        .cv2Media img { max-width: 100%; max-height: 260px; border-radius: 8px; border: 1px solid #3f4147; display: block; }
        .cv2Thumbnail img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; border: 1px solid #3f4147; }
        .cv2File { color: #00a8fc; text-decoration: none; }
        .cv2Nested { display: grid; gap: 8px; }

        @media (max-width: 800px) {
          .sidebar { display: none; }
          .infoGrid { grid-template-columns: 1fr; }
          .infoGrid .wide { grid-column: span 1; }
          .ticketInfo { margin: 12px; }
          .message { padding: 8px 12px; }
          .attachment img { max-width: 100%; }
          .componentsV2, .cv2Card { max-width: 100%; }
        }
      `}</style>
    </main>
  );
}
