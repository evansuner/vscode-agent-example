import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api-proxy.shmxrd.com/v1',
});

export async function POST(req: NextRequest) {
  try {
    // 解析请求数据
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的消息数组' },
        { status: 400 }
      );
    }

    // 准备发送给OpenAI的消息格式
    const openaiMessages = messages.map((msg) => ({
      // 将'ai'角色转换为OpenAI API接受的'assistant'角色
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // 返回OpenAI的响应
    return NextResponse.json({
      content: completion.choices[0].message.content,
      role: 'assistant', // 使用'assistant'替代'ai'
    });
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    return NextResponse.json({ error: '与AI助手通信时出错' }, { status: 500 });
  }
}
