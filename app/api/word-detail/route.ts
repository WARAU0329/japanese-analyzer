import { NextRequest, NextResponse } from 'next/server';

// API密钥从环境变量获取，不暴露给前端
const API_KEY = process.env.API_KEY || '';
const API_URL = process.env.API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { word, pos, sentence, furigana, romaji, model = MODEL_NAME, apiUrl } = await req.json();
    
    // 从请求头中获取用户提供的API密钥（如果有）
    const authHeader = req.headers.get('Authorization');
    const userApiKey = authHeader ? authHeader.replace('Bearer ', '') : '';
    
    // 优先使用用户API密钥，如果没有则使用环境变量中的密钥
    const effectiveApiKey = userApiKey || API_KEY;
    
    // 优先使用用户提供的API URL，否则使用环境变量中的URL
    const effectiveApiUrl = apiUrl || API_URL;
    
    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: { message: '未提供API密钥，请在设置中配置API密钥或联系管理员配置服务器密钥' } },
        { status: 500 }
      );
    }

    if (!word || !pos || !sentence) {
      return NextResponse.json(
        { error: { message: '缺少必要的参数' } },
        { status: 400 }
      );
    }

    // 构建详情查询请求，要求繁體中文台灣用語，嚴格 JSON 格式返回
    const detailPrompt = `在日語句子「${sentence}」的上下文中，單字「${word}」(詞性: ${pos}${furigana ? `, 讀音: ${furigana}` : ''}${romaji ? `, 羅馬音: ${romaji}` : ''}) 的具體含義是什麼？請以繁體中文（台灣用語）回答，並以嚴格的 JSON 格式返回，內容中不要有 markdown 或其他非 JSON 字符。

請特別注意：
1. 若是動詞，請準確識別時態（過去式、現在式等）、語態（被動、使役等）和敬語程度（普通體、敬體等）
2. 助動詞與動詞組合（如「食べた」）請明確說明原形與活用過程
3. 形容詞請區分い形容詞與な形容詞，並識別活用形式
4. 請準確提供辭書形，若已是辭書形，請填相同值
5. 請使用自然、口語化的繁體中文，不使用簡體字，避免英文或其他語言

JSON 格式範例：
{
  "originalWord": "${word}",
  "chineseTranslation": "這裡填繁體中文翻譯",
  "pos": "${pos}",
  "furigana": "${furigana || ''}",
  "romaji": "${romaji || ''}",
  "dictionaryForm": "這裡填辭書形（如果適用）",
  "explanation": "這裡填繁體中文解釋，包括詞形變化、時態、語態等詳細語法信息"
}`;

    const payload = {
      model: model,
      reasoning_effort: "none",
      messages: [{ role: "user", content: detailPrompt }],
    };

    // 发送到实际的AI API
    const response = await fetch(effectiveApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`
      },
      body: JSON.stringify(payload)
    });

    // 获取AI API的响应
    const data = await response.json();

    if (!response.ok) {
      console.error('AI API error (Word Detail):', data);
      return NextResponse.json(
        { error: data.error || { message: '获取词汇详情时出错' } },
        { status: response.status }
      );
    }

    // 将AI API的响应传回给客户端
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error (Word Detail):', error);
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : '服务器错误' } },
      { status: 500 }
    );
  }
}
