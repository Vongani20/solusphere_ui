import React, { useEffect, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  SparklesIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError } from "../services/api";

function cleanHeading(value) {
  return value.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
}

function InlineText({ text, inverse = false }) {
  const parts = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={`${match[3]}-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className={inverse ? "font-semibold underline" : "font-semibold text-primary hover:text-primary-dark"}
        >
          {match[2]}
        </a>
      );
    } else if (match[5]) {
      parts.push(<strong key={`${match[5]}-${match.index}`}>{match[5]}</strong>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function parseTableCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanHeading(cell.trim()));
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && parseTableCells(trimmed).length > 1;
}

function isTableSeparator(line) {
  return isTableRow(line) && parseTableCells(line).every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function MarkdownTable({ rows }) {
  const parsedRows = rows.map(parseTableCells);
  const header = parsedRows[0] || [];
  const body = parsedRows.slice(isTableSeparator(rows[1] || "") ? 2 : 1);

  if (header.length === 0 || body.length === 0) {
    return null;
  }

  return (
    <div className="my-7 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm sm:text-base">
          <thead className="bg-slate-50">
            <tr>
              {header.map((cell, index) => (
                <th key={`${cell}-${index}`} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                  <InlineText text={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {body.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="align-top">
                {header.map((_, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 leading-7 text-slate-700">
                    <InlineText text={row[cellIndex] || ""} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormattedContent({ content, inverse = false }) {
  return <RichLines lines={String(content || "").replace(/\r/g, "").split("\n")} inverse={inverse} />;
}

function RichLines({ lines, inverse = false }) {
  const items = [];
  let list = [];
  let listType = "bullet";
  let hasHeroHeading = false;

  const flushList = () => {
    if (!list.length) return;

    if (listType === "number") {
      items.push(
        <ol
          key={`list-${items.length}`}
          className={`my-6 space-y-3 pl-6 text-base leading-7 sm:text-lg sm:leading-8 ${
            inverse ? "text-white" : "text-slate-700"
          }`}
        >
          {list.map((line, index) => (
            <li key={`${line}-${index}`} className="list-decimal pl-1">
              <InlineText text={line} inverse={inverse} />
            </li>
          ))}
        </ol>
      );
    } else if (inverse) {
      items.push(
        <ul key={`list-${items.length}`} className="my-3 space-y-2 pl-5 text-sm leading-6 text-white">
          {list.map((line, index) => (
            <li key={`${line}-${index}`} className="list-disc">
              <InlineText text={line} inverse={inverse} />
            </li>
          ))}
        </ul>
      );
    } else {
      items.push(
        <div key={`list-${items.length}`} className="my-8 space-y-5 pl-6 md:pl-20">
          {list.map((line, index) => (
            <div key={`${line}-${index}`} className="grid grid-cols-[8px_1fr] gap-4">
              <span className="mt-3 h-2 w-2 rounded-full bg-violet-500" aria-hidden="true" />
              <p className="text-base font-normal leading-8 text-slate-700 sm:text-lg sm:leading-9">
                <InlineText text={line} />
              </p>
            </div>
          ))}
        </div>
      );
    }

    list = [];
    listType = "bullet";
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (!inverse && isTableRow(line)) {
      const tableRows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        tableRows.push(lines[index]);
        index += 1;
      }
      index -= 1;
      flushList();
      items.push(<MarkdownTable key={`table-${items.length}`} rows={tableRows} />);
      continue;
    }

    const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
    if (heading) {
      flushList();
      const title = cleanHeading(heading[1]);
      const isHero = !inverse && !hasHeroHeading;
      hasHeroHeading = true;
      items.push(
        isHero ? (
          <h2
            key={`heading-${index}`}
            className={`mb-6 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl ${
              inverse ? "text-white" : "text-slate-950"
            }`}
          >
            {title}
          </h2>
        ) : (
          <h3
            key={`heading-${index}`}
            className={
              inverse
                ? "mb-2 mt-3 text-sm font-bold leading-snug tracking-normal text-white"
                : "mb-3 mt-8 text-xl font-extrabold leading-snug tracking-normal text-slate-950"
            }
          >
            {title}
          </h3>
        )
      );
      continue;
    }

    const bullet = line.match(/^(?:[-*]|\u2022)\s+(.+)$/);
    if (bullet) {
      if (list.length && listType !== "bullet") flushList();
      listType = "bullet";
      list.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+[\.)]\s+(.+)$/);
    if (numbered) {
      if (list.length && listType !== "number") flushList();
      listType = "number";
      list.push(numbered[1]);
      continue;
    }

    flushList();
    items.push(
      <p
        key={`paragraph-${index}`}
        className={`my-5 text-base leading-8 sm:text-lg sm:leading-9 ${inverse ? "text-white" : "text-slate-700"}`}
      >
        <InlineText text={line.replace(/^#+\s*/, "")} inverse={inverse} />
      </p>
    );
  }

  flushList();

  return <div className={inverse ? "text-white" : "article-output text-slate-700"}>{items}</div>;
}

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me anything in one place. I can search the web, review a website, create analytics summaries, and use attached image context.",
      sources: [],
    },
  ]);
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const attachmentsRef = useRef([]);

  const hasContent = query.trim() || attachments.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    };
  }, []);

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    const nextAttachments = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID?.() || Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
    }));

    setAttachments((items) => [...items, ...nextAttachments].slice(0, 6));
    event.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((items) => {
      const target = items.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return items.filter((item) => item.id !== id);
    });
  };

  const clearAttachments = () => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    setAttachments([]);
  };

  const buildAgentPrompt = (userQuery) => {
    const sections = [
      "You are SIA, SoluSphere's agent. Use web search when current information, websites, companies, products, policies, or public facts may matter.",
      "Format every reply like a polished article inside the app: a specific title when useful, short paragraphs, spacious point-form bullets, and clean Markdown tables only when structured data is clearer than prose.",
      "If the user asks for analytics, structure the response with a specific title, concise overview, findings, likely drivers, risks, next actions, and useful metrics.",
      "If the user includes a website URL, inspect/search public context for that website and provide practical recommendations.",
      "Use concise point form when it improves readability. Use Markdown tables for comparisons, metrics, pros/cons, ranked options, or structured recommendations.",
      "Return a polished client-ready answer. Do not repeat these instructions, do not mention internal prompt labels, do not show raw prompt text, and do not start with generic labels like Prompt or User request.",
      `Request: ${userQuery || "Analyze the supplied image context."}`,
    ];

    if (attachments.length > 0) {
      sections.push(
        [
          "Images attached in the UI:",
          ...attachments.map(
            (attachment, index) =>
              `${index + 1}. ${attachment.name} (${attachment.type || "image"}, ${Math.round(attachment.size / 1024)} KB)`
          ),
          "If server-side vision is not enabled, be clear that image visual inspection needs the image-capable backend endpoint and use the user's text plus filenames as context.",
        ].join("\n")
      );
    }

    return sections.join("\n\n");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasContent || loading) return;

    const userQuery = query.trim();
    const prompt = buildAgentPrompt(userQuery);
    const messageAttachments = attachments.map(({ id, name, type, size, previewUrl }) => ({
      id,
      name,
      type,
      size,
      previewUrl,
    }));

    setQuery("");
    setMessages((items) => [
      ...items,
      {
        role: "user",
        content: userQuery || "Analyze the attached image context.",
        attachments: messageAttachments,
      },
    ]);
    setLoading(true);

    try {
      const res = await api.post("/chatbot", {
        message: prompt,
        web_search: true,
      });

      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content: res.data.reply,
          sources: res.data.sources || [],
          meta: {
            model: res.data.model,
            webSearchEnabled: res.data.web_search_enabled,
          },
        },
      ]);
    } catch (err) {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content: getApiError(err, "SIA could not process that request."),
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
      clearAttachments();
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
            <SparklesIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-heading">SIA Agent</h1>
            <p className="text-[8px] font-medium text-muted">Web · website analytics · image context</p>
          </div>
        </div>

        <section className="card flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div key={`${message.role}-${index}`} className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                      isUser ? "bg-heading" : "bg-primary-light"
                    } text-white`}
                  >
                    {isUser ? <UserCircleIcon className="h-6 w-6" /> : <SparklesIcon className="h-6 w-6" />}
                  </div>

                  <div className={`min-w-0 ${isUser ? "max-w-[88%] text-right" : "flex-1"}`}>
                    <div
                      className={`text-left ${
                        isUser
                          ? "inline-block rounded-lg bg-primary px-4 py-3 text-white"
                          : "w-full rounded-lg bg-white px-2 py-1 text-slate-900"
                      }`}
                    >
                      <FormattedContent content={message.content} inverse={isUser} />
                    </div>

                    {message.attachments?.length > 0 && (
                      <div className={`mt-3 grid gap-2 sm:grid-cols-2 ${isUser ? "justify-items-end" : ""}`}>
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <img src={attachment.previewUrl} alt={attachment.name} className="h-28 w-full object-cover" />
                            <p className="max-w-48 truncate px-2 py-1 text-xs font-semibold text-slate-600">{attachment.name}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isUser && message.sources?.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {message.sources.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs hover:border-primary hover:bg-primary/5"
                          >
                            <ArrowTopRightOnSquareIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="min-w-0">
                              <span className="block truncate font-bold text-slate-800">{source.title || "Source"}</span>
                              <span className="block truncate text-slate-500">{source.url}</span>
                            </span>
                          </a>
                        ))}
                      </div>
                    )}

                    {!isUser && message.meta?.model && (
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {message.meta.model} {message.meta.webSearchEnabled ? "- searched web" : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-white">
                  <SparklesIcon className="h-6 w-6" />
                </div>
                <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
                  Searching and analyzing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex max-w-64 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <img src={attachment.previewUrl} alt={attachment.name} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-700">{attachment.name}</p>
                    <p className="text-xs text-slate-500">{Math.round(attachment.size / 1024)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex items-end gap-2 rounded-lg border border-slate-300 bg-white p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <MagnifyingGlassIcon className="mb-2.5 ml-2 h-5 w-5 shrink-0 text-slate-400" />
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Search, paste a website, ask for analytics…"
                className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                disabled={loading}
                rows={1}
              />
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
                aria-label="Attach images"
              >
                <PhotoIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={loading || !hasContent}
                className="mb-1 rounded-lg bg-primary p-2 text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Run SIA search"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
