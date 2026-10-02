'use client';

import { useState, useCallback } from 'react';
import { ChatMessage } from '../types';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { useUserStore } from '../store/useUserStore';
import { streamChatMessage } from '../services/api';
import { MOCK_MODELS } from '../data/mock';

export function useChatCore() {
  const {
    currentChatId,
    chats,
    pendingFiles,
    pendingAttachments,
    addChat,
    addMessageToChat,
    updateMessageContent,
    editUserMessageAndBranch,
    createAssistantVersion,
    clearPendingFiles,
  } = useChatStore();
  const { selectedModelId } = useUIStore();
  const { deductUsage, apiKeys } = useUserStore();

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const currentModel = MOCK_MODELS.find((m) => m.id === selectedModelId) || MOCK_MODELS[0];
  const currentChat = chats.find((c) => c.id === currentChatId) || null;
  const messages = currentChat?.messages || [];

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    const currentPendingAttachments = [...pendingAttachments];
    const currentPendingFiles = [...pendingFiles];

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      files: currentPendingFiles.length > 0 ? currentPendingFiles : undefined,
      attachments: currentPendingAttachments.length > 0 ? currentPendingAttachments : undefined,
      createdAt: new Date().toISOString(),
    };

    let targetChatId = currentChatId;

    if (!targetChatId) {
      const newId = `chat_${Date.now()}`;
      const newChat = {
        id: newId,
        title: trimmed.slice(0, 45) || 'New chat',
        model: selectedModelId,
        pinned: false,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      addChat(newChat);
      targetChatId = newId;
    }

    addMessageToChat(targetChatId, userMsg);
    setInput('');
    clearPendingFiles();
    setIsStreaming(true);

    deductUsage(trimmed, 1.2);

    const assistantMsgId = `a_${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      model: selectedModelId,
      content: '',
      createdAt: new Date().toISOString(),
    };

    addMessageToChat(targetChatId, initialAssistantMsg);

    // Collect all documents uploaded in this chat session + current pending attachments
    const pastAttachments = (currentChat?.messages || []).flatMap((m) => m.attachments || []);
    const combinedAttachmentsMap = new Map<string, any>();
    [...pastAttachments, ...currentPendingAttachments].forEach((att) => {
      if (att && att.name) {
        combinedAttachmentsMap.set(att.name.toLowerCase(), att);
      }
    });
    const activeAttachments = Array.from(combinedAttachmentsMap.values());

    try {
      const historyContext = (currentChat?.messages || []).slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await streamChatMessage(
        {
          prompt: trimmed,
          model: selectedModelId,
          chatId: targetChatId,
          attachments: activeAttachments,
          apiKeys,
          history: historyContext,
        },
        (accumulatedText) => {
          updateMessageContent(targetChatId!, assistantMsgId, accumulatedText);
        }
      );

      deductUsage('Completed AI Response', 1.8);
    } catch {
      updateMessageContent(
        targetChatId,
        assistantMsgId,
        '**Error**: Unable to reach AI inference service. Please check your network or API keys.'
      );
    } finally {
      setIsStreaming(false);
    }
  }, [
    input,
    currentChatId,
    selectedModelId,
    pendingFiles,
    pendingAttachments,
    currentChat,
    apiKeys,
    addChat,
    addMessageToChat,
    updateMessageContent,
    clearPendingFiles,
    deductUsage,
  ]);

  const handleEditRetry = useCallback(
    async (messageId: string, newPrompt: string) => {
      if (!currentChatId || !newPrompt.trim()) return;

      editUserMessageAndBranch(currentChatId, messageId, newPrompt);
      setIsStreaming(true);
      deductUsage(newPrompt, 1.2);

      // Find the following assistant message or create a new one
      const msgIndex = (currentChat?.messages || []).findIndex((m) => m.id === messageId);
      const nextMsg = currentChat?.messages[msgIndex + 1];

      let targetAssistantId = nextMsg?.id;
      if (!targetAssistantId) {
        targetAssistantId = `a_${Date.now()}`;
        addMessageToChat(currentChatId, {
          id: targetAssistantId,
          role: 'assistant',
          model: selectedModelId,
          content: '',
          createdAt: new Date().toISOString(),
        });
      } else {
        createAssistantVersion(currentChatId, targetAssistantId, '');
      }

      try {
        const historyContext = (currentChat?.messages || []).slice(0, msgIndex).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const chatAttachments = (currentChat?.messages || []).flatMap((m) => m.attachments || []);
        const uniqueAttachments = Array.from(
          new Map(chatAttachments.map((a) => [a.name.toLowerCase(), a])).values()
        );

        await streamChatMessage(
          {
            prompt: newPrompt,
            model: selectedModelId,
            chatId: currentChatId,
            attachments: uniqueAttachments,
            apiKeys,
            history: historyContext,
          },
          (accumulatedText) => {
            updateMessageContent(currentChatId, targetAssistantId!, accumulatedText);
          }
        );

        deductUsage('Completed Branch AI Response', 1.8);
      } catch {
        updateMessageContent(
          currentChatId,
          targetAssistantId!,
          '**Error**: Unable to complete branching response.'
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [
      currentChatId,
      currentChat,
      selectedModelId,
      apiKeys,
      editUserMessageAndBranch,
      createAssistantVersion,
      addMessageToChat,
      updateMessageContent,
      deductUsage,
    ]
  );

  const handleRegenerate = useCallback(
    async (assistantMsgId: string) => {
      if (!currentChatId || !currentChat) return;

      const targetMsgIndex = currentChat.messages.findIndex((m) => m.id === assistantMsgId);
      if (targetMsgIndex === -1) return;

      const prevUserMsg = currentChat.messages[targetMsgIndex - 1];
      const promptToUse = prevUserMsg?.content || 'Please provide an alternative response.';

      createAssistantVersion(currentChatId, assistantMsgId, '');
      setIsStreaming(true);
      deductUsage('Regeneration Request', 1.0);

      try {
        const historyContext = currentChat.messages.slice(0, targetMsgIndex - 1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const chatAttachments = (currentChat?.messages || []).flatMap((m) => m.attachments || []);
        const uniqueAttachments = Array.from(
          new Map(chatAttachments.map((a) => [a.name.toLowerCase(), a])).values()
        );

        await streamChatMessage(
          {
            prompt: promptToUse,
            model: selectedModelId,
            chatId: currentChatId,
            attachments: uniqueAttachments,
            apiKeys,
            history: historyContext,
          },
          (accumulatedText) => {
            updateMessageContent(currentChatId, assistantMsgId, accumulatedText);
          }
        );

        deductUsage('Completed Regenerated Response', 1.8);
      } catch {
        updateMessageContent(
          currentChatId,
          assistantMsgId,
          '**Error**: Regeneration failed. Please try again.'
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [currentChatId, currentChat, selectedModelId, apiKeys, createAssistantVersion, updateMessageContent, deductUsage]
  );

  return {
    input,
    setInput,
    isStreaming,
    currentModel,
    currentChat,
    messages,
    handleSend,
    handleEditRetry,
    handleRegenerate,
  };
}
