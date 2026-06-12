import React, { useState } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError } from "../services/api";
import { formatDate, statusTone } from "../utils/formatters";

export default function HelpDesk() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [ticket, setTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "agent",
      content: "Hi, I am ready to help with BPO support questions.",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const submitTicket = async (event) => {
    event.preventDefault();
    setTicketLoading(true);
    setTicketError("");
    setTicket(null);

    try {
      const res = await api.post("/helpdesk", { subject, description });
      setTicket(res.data.ticket);
      setSubject("");
      setDescription("");
    } catch (err) {
      setTicketError(getApiError(err, "Ticket submission failed."));
    } finally {
      setTicketLoading(false);
    }
  };

  const sendChatMessage = async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((items) => [...items, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const res = await api.post("/helpdesk-chat", { user_message: userMessage });
      setChatMessages((items) => [
        ...items,
        { role: "agent", content: res.data.agent_message || res.data.agentMessage || "No response returned." },
      ]);
    } catch (err) {
      setChatMessages((items) => [
        ...items,
        { role: "agent", content: getApiError(err, "The helpdesk assistant could not respond.") },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                <TicketIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-950">Help Desk</h1>
                <p className="text-sm text-slate-500">Support tickets with AI triage</p>
              </div>
            </div>

            {ticketError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
                {ticketError}
              </div>
            )}

            <form onSubmit={submitTicket} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="input"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="input min-h-40 resize-y"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={ticketLoading}
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                {ticketLoading ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>

          {ticket && (
            <div className="card">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircleIcon className="h-5 w-5" />
                    <p className="font-bold">Ticket #{ticket.id}</p>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">{ticket.subject}</h2>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(ticket.created_at)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>

              <div className="space-y-4">
                <TicketSection title="Description" content={ticket.description} icon={TicketIcon} />
                <TicketSection title="AI Analysis" content={ticket.aiAnalysis} icon={SparklesIcon} />
                <TicketSection title="Suggested Solution" content={ticket.aiSolution} icon={CheckCircleIcon} />
                <TicketSection title="Approach" content={ticket.aiApproach} icon={ClockIcon} />
              </div>
            </div>
          )}
        </section>

        <section className="card flex min-h-[calc(100vh-8.5rem)] flex-col">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-600 text-white">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Helpdesk Chat</h2>
              <p className="text-sm text-slate-500">BPO support assistant</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {chatMessages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div key={`${message.role}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[84%] rounded-lg px-4 py-3 ${
                      isUser ? "bg-primary text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">Thinking...</div>
              </div>
            )}
          </div>

          <form onSubmit={sendChatMessage} className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask the helpdesk"
              className="input flex-1"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="btn btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}

function TicketSection({ title, content, icon: Icon }) {
  return (
    <div className="border-l-4 border-primary pl-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-slate-950">{title}</h3>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{content || "Not available"}</p>
    </div>
  );
}
