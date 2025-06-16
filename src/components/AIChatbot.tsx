import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, CornerDownLeft, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { callDeepSeek } from "@/lib/ai";
import { testOpenRouterConnection } from "@/lib/apiTest";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatbotProps {
  pdfContext: string | null;
}

export const AIChatbot = ({ pdfContext }: AIChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setMessages([
        { 
          role: 'assistant' as const, 
          content: "Hello! I'm ESGenius Assistant. How can I help you with this ESG report today?" 
        }
      ]);
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testOpenRouterConnection();
      if (result.success) {
        toast.success("API connection test successful!");
        console.log("API Test Success:", result.data);
      } else {
        toast.error(`API test failed: ${result.error}`);
        console.error("API Test Failed:", result.error);
      }
    } catch (error) {
      toast.error("API test error. Check console for details.");
      console.error("API Test Error:", error);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() === "" || isTyping) return;
    
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    
    try {
      const response = await callDeepSeek(newMessages, pdfContext);
      setMessages([...newMessages, { role: 'assistant' as const, content: response }]);
    } catch (error) {
      toast.error("Error from AI assistant. Please try again.");
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-xl"
          >
            <Sparkles size={24} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Chat with ESGenius Assistant</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] flex flex-col bg-gray-900 border border-gray-700 rounded-xl shadow-2xl animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <Bot className="text-purple-400" />
          <h3 className="font-semibold text-lg">ESGenius Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestConnection} 
                disabled={testingConnection}
                className="text-xs h-8 px-2"
              >
                {testingConnection ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test API"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Test OpenRouter API connection</p>
            </TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && <Bot className="flex-shrink-0 text-purple-400" />}
            <div className={`px-4 py-2 rounded-lg max-w-[80%] text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-200 rounded-bl-none'
            }`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
            {msg.role === 'user' && <User className="flex-shrink-0" />}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-start gap-3">
            <Bot className="flex-shrink-0 text-purple-400" />
            <div className="px-4 py-2 rounded-lg bg-gray-800 text-gray-200 rounded-bl-none">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this report..."
            className="bg-gray-800 border-gray-600 pr-20 resize-none text-sm"
            rows={2}
            disabled={isTyping}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button type="submit" size="sm" onClick={handleSend} disabled={isTyping || input.trim() === ''} className="bg-purple-600 hover:bg-purple-700">
              <Send size={16} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press <CornerDownLeft size={12} className="inline-block" /> for new line
        </p>
      </div>
    </div>
  );
};
