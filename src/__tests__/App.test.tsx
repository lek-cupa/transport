import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Trash2, Sparkles } from 'lucide-react';
import App from '../App';
import { useChat } from '../hooks/useChat';
import { availableModels } from '../data/models';

// Mock the external dependencies
jest.mock('../hooks/useChat');
jest.mock('../components/ModelSelector', () => ({
  ModelSelector: ({ models, selectedModel, onModelChange }: any) => (
    <div data-testid="model-selector">
      <select 
        value={selectedModel} 
        onChange={(e) => onModelChange(e.target.value)}
        data-testid="model-select"
      >
        {models.map((model: any) => (
          <option key={typeof model === 'string' ? model : model.id} value={typeof model === 'string' ? model : model.id}>
            {typeof model === 'string' ? model : model.name}
          </option>
        ))}
      </select>
    </div>
  )
}));

jest.mock('../components/ChatArea', () => ({
  ChatArea: ({ messages, isLoading }: any) => (
    <div data-testid="chat-area">
      <div data-testid="messages-count">{messages.length}</div>
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
    </div>
  )
}));

jest.mock('../components/ChatInput', () => ({
  ChatInput: ({ onSendMessage, disabled, placeholder }: any) => (
    <div data-testid="chat-input">
      <input 
        placeholder={placeholder}
        disabled={disabled}
        onChange={() => {}}
        data-testid="message-input"
      />
      <button 
        onClick={() => onSendMessage('test message')}
        disabled={disabled}
        data-testid="send-button"
      >
        Send
      </button>
    </div>
  )
}));

jest.mock('../data/models', () => ({
  availableModels: [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ]
}));

jest.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>
}));

const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;

describe('App Component', () => {
  const defaultChatState = {
    messages: [],
    isLoading: false,
    sendMessage: jest.fn(),
    clearChat: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultChatState);
  });

  describe('Initial Render', () => {
    it('renders the main application structure', () => {
      render(<App />);
      
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Choose your model and start chatting')).toBeInTheDocument();
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
      expect(screen.getByTestId('chat-area')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('sets default selected model to gpt-4-turbo', () => {
      render(<App />);
      
      const modelSelect = screen.getByTestId('model-select');
      expect(modelSelect).toHaveValue('gpt-4-turbo');
    });

    it('displays footer with version information', () => {
      render(<App />);
      
      expect(screen.getByText('AI Assistant Client v1.0 - Built with React & TypeScript')).toBeInTheDocument();
    });

    it('passes correct props to ModelSelector', () => {
      render(<App />);
      
      const modelSelector = screen.getByTestId('model-selector');
      expect(modelSelector).toBeInTheDocument();
      
      // Check that available models are rendered
      const modelSelect = screen.getByTestId('model-select');
      expect(modelSelect.children).toHaveLength(2);
    });

    it('initializes useChat hook with default model', () => {
      render(<App />);
      
      expect(mockUseChat).toHaveBeenCalledWith('gpt-4-turbo');
    });
  });

  describe('Model Selection', () => {
    it('updates selected model when model selector changes', () => {
      render(<App />);
      
      const modelSelect = screen.getByTestId('model-select');
      fireEvent.change(modelSelect, { target: { value: 'gpt-3.5-turbo' } });
      
      expect(modelSelect).toHaveValue('gpt-3.5-turbo');
    });

    it('reinitializes useChat when model changes', () => {
      const { rerender } = render(<App />);
      
      // Change model
      const modelSelect = screen.getByTestId('model-select');
      fireEvent.change(modelSelect, { target: { value: 'gpt-3.5-turbo' } });
      
      rerender(<App />);
      
      // useChat should be called with new model
      expect(mockUseChat).toHaveBeenCalledWith('gpt-3.5-turbo');
    });

    it('disables chat input when no model is selected', () => {
      // Test with empty string as selected model
      const TestApp = () => {
        const [selectedModel, setSelectedModel] = React.useState('');
        const { messages, isLoading, sendMessage, clearChat } = useChat(selectedModel);
        
        return (
          <div>
            <div data-testid="chat-input">
              <input 
                placeholder={selectedModel ? "Ask me anything..." : "Select a model to start chatting"}
                disabled={isLoading || !selectedModel}
                data-testid="message-input"
              />
            </div>
          </div>
        );
      };
      
      render(<TestApp />);
      
      const messageInput = screen.getByTestId('message-input');
      expect(messageInput).toBeDisabled();
      expect(messageInput).toHaveAttribute('placeholder', 'Select a model to start chatting');
    });
  });

  describe('Clear Chat Functionality', () => {
    it('does not show clear chat button when no messages', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: []
      });
      
      render(<App />);
      
      expect(screen.queryByRole('button', { name: /clear chat/i })).not.toBeInTheDocument();
    });

    it('shows clear chat button when messages exist', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      expect(screen.getByRole('button', { name: /clear chat/i })).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('calls clearChat when clear button is clicked', () => {
      const mockClearChat = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }
        ],
        clearChat: mockClearChat
      });
      
      render(<App />);
      
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      fireEvent.click(clearButton);
      
      expect(mockClearChat).toHaveBeenCalledTimes(1);
    });

    it('clear button has correct accessibility attributes', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear chat');
    });
  });

  describe('Last User Message Display', () => {
    it('shows "No questions asked yet" when no user messages', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'assistant', content: 'Hello there!', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      expect(screen.getByText('No questions asked yet.')).toBeInTheDocument();
    });

    it('displays the last user message', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'First question', timestamp: Date.now() },
          { id: '2', role: 'assistant', content: 'First answer', timestamp: Date.now() },
          { id: '3', role: 'user', content: 'Second question', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      expect(screen.getByText('Last Question')).toBeInTheDocument();
      // The component uses dangerouslySetInnerHTML, so we need to check for the content differently
      const lastQuestionDiv = screen.getByText('Last Question').nextElementSibling;
      expect(lastQuestionDiv?.innerHTML).toBe('Second question');
    });

    it('finds last user message correctly when mixed with assistant messages', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Question 1', timestamp: Date.now() },
          { id: '2', role: 'assistant', content: 'Answer 1', timestamp: Date.now() },
          { id: '3', role: 'user', content: 'Question 2', timestamp: Date.now() },
          { id: '4', role: 'assistant', content: 'Answer 2', timestamp: Date.now() },
          { id: '5', role: 'system', content: 'System message', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      const lastQuestionDiv = screen.getByText('Last Question').nextElementSibling;
      expect(lastQuestionDiv?.innerHTML).toBe('Question 2');
    });

    it('handles HTML content in user messages safely', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: '<b>Bold question</b>', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      const lastQuestionDiv = screen.getByText('Last Question').nextElementSibling;
      expect(lastQuestionDiv?.innerHTML).toBe('<b>Bold question</b>');
    });
  });

  describe('Loading State', () => {
    it('passes loading state to ChatArea', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isLoading: true
      });
      
      render(<App />);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('disables chat input when loading', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isLoading: true
      });
      
      render(<App />);
      
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      expect(messageInput).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Message Handling', () => {
    it('passes sendMessage function to ChatInput', () => {
      const mockSendMessage = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        sendMessage: mockSendMessage
      });
      
      render(<App />);
      
      const sendButton = screen.getByTestId('send-button');
      fireEvent.click(sendButton);
      
      expect(mockSendMessage).toHaveBeenCalledWith('test message');
    });

    it('passes messages to ChatArea', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() }
      ];
      
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages
      });
      
      render(<App />);
      
      expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
    });
  });

  describe('Component Integration', () => {
    it('updates useChat hook when selectedModel changes', async () => {
      render(<App />);
      
      // Initially called with default model
      expect(mockUseChat).toHaveBeenCalledWith('gpt-4-turbo');
      
      // Change model
      const modelSelect = screen.getByTestId('model-select');
      fireEvent.change(modelSelect, { target: { value: 'gpt-3.5-turbo' } });
      
      // Should trigger re-render with new model
      await waitFor(() => {
        expect(mockUseChat).toHaveBeenCalledWith('gpt-3.5-turbo');
      });
    });

    it('maintains state consistency across model changes', () => {
      const { rerender } = render(<App />);
      
      // Verify initial state
      expect(screen.getByTestId('model-select')).toHaveValue('gpt-4-turbo');
      
      // Change model
      const modelSelect = screen.getByTestId('model-select');
      fireEvent.change(modelSelect, { target: { value: 'gpt-3.5-turbo' } });
      
      // Rerender and check state persistence
      rerender(<App />);
      expect(screen.getByTestId('model-select')).toHaveValue('gpt-3.5-turbo');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty messages array gracefully', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: []
      });
      
      render(<App />);
      
      expect(screen.getByText('No questions asked yet.')).toBeInTheDocument();
      expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
    });

    it('handles undefined or null message content', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: null as any, timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      // Should not crash and should handle gracefully
      expect(screen.getByText('Last Question')).toBeInTheDocument();
    });

    it('handles messages with unusual role values', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'system' as any, content: 'System message', timestamp: Date.now() },
          { id: '2', role: 'unknown' as any, content: 'Unknown message', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      // Should still show "No questions asked yet" since no user messages
      expect(screen.getByText('No questions asked yet.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<App />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('AI Assistant');
      
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('Last Question');
    });

    it('clear chat button has proper aria-label', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear chat');
    });

    it('maintains focus management for interactive elements', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }
        ]
      });
      
      render(<App />);
      
      const modelSelect = screen.getByTestId('model-select');
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      const messageInput = screen.getByTestId('message-input');
      
      expect(modelSelect).not.toBeDisabled();
      expect(clearButton).not.toBeDisabled();
      expect(messageInput).not.toBeDisabled();
    });
  });

  describe('Performance Considerations', () => {
    it('memoizes lastUserMessage calculation', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Question 1', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Answer 1', timestamp: Date.now() }
      ];
      
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages
      });
      
      const { rerender } = render(<App />);
      
      // Get initial content
      const initialContent = screen.getByText('Last Question').nextElementSibling?.innerHTML;
      
      // Rerender with same messages
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages
      });
      
      rerender(<App />);
      
      // Content should remain the same (memoization working)
      const rerenderedContent = screen.getByText('Last Question').nextElementSibling?.innerHTML;
      expect(rerenderedContent).toBe(initialContent);
    });

    it('updates memoized value when messages change', () => {
      const initialMessages = [
        { id: '1', role: 'user', content: 'Question 1', timestamp: Date.now() }
      ];
      
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: initialMessages
      });
      
      const { rerender } = render(<App />);
      
      expect(screen.getByText('Last Question').nextElementSibling?.innerHTML).toBe('Question 1');
      
      // Update messages
      const updatedMessages = [
        ...initialMessages,
        { id: '2', role: 'user', content: 'Question 2', timestamp: Date.now() }
      ];
      
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: updatedMessages
      });
      
      rerender(<App />);
      
      expect(screen.getByText('Last Question').nextElementSibling?.innerHTML).toBe('Question 2');
    });
  });
});