import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chat } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useChatList() {
  const storeChats = useAppStore((state) => state.chats);

  return useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      await new Promise((res) => setTimeout(res, 100));
      return storeChats;
    },
    initialData: storeChats,
  });
}

export function useCreateChatMutation() {
  const queryClient = useQueryClient();
  const addChat = useAppStore((state) => state.addChat);

  return useMutation({
    mutationFn: async (newChat: Chat) => {
      await new Promise((res) => setTimeout(res, 150));
      addChat(newChat);
      return newChat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}
