
export type Screen = 
  | 'home' 
  | 'instructions' 
  | 'menu' 
  | 'learning' 
  | 'game1' 
  | 'game2' 
  | 'story'
  | 'vocab_menu'
  | 'vocab_learning'
  | 'vocab_game1'
  | 'vocab_game2'
  | 'vocab_story';

export interface CharacterData {
  char: string;
  romaji: string;
  strokeSvg: string;
  strokeImageUrl?: string;
}

export interface VocabData {
  id: string;
  word: string;
  meaning: string;
  illustration: string; // 插畫與遊戲選項皆使用 Emoji
}

export const HIRAGANA_A_COLUMN: CharacterData[] = [
  { 
    char: 'あ', romaji: 'a', strokeSvg: '',
    strokeImageUrl: 'https://raw.githubusercontent.com/nihow79207-wang/japanese-assets/main/あ.png'
  },
  { 
    char: 'い', romaji: 'i', strokeSvg: '',
    strokeImageUrl: 'https://raw.githubusercontent.com/nihow79207-wang/japanese-assets/main/い.png' 
  },
  { 
    char: 'う', romaji: 'u', strokeSvg: '',
    strokeImageUrl: 'https://raw.githubusercontent.com/nihow79207-wang/japanese-assets/main/う.png'
  },
  { 
    char: 'え', romaji: 'e', strokeSvg: '',
    strokeImageUrl: 'https://raw.githubusercontent.com/nihow79207-wang/japanese-assets/main/え.png'
  },
  { 
    char: 'お', romaji: 'o', strokeSvg: '',
    strokeImageUrl: 'https://raw.githubusercontent.com/nihow79207-wang/japanese-assets/main/お.png'
  }
];

export const FRUIT_A: VocabData[] = [
  { id: 'apple', word: 'りんご', meaning: '蘋果', illustration: '🍎' },
  { id: 'grape', word: 'ぶどう', meaning: '葡萄', illustration: '🍇' },
  { id: 'melon', word: 'メロン', meaning: '哈密瓜', illustration: '🍈' },
  { id: 'orange', word: 'みかん', meaning: '橘子', illustration: '🍊' },
  { id: 'watermelon', word: 'すいか', meaning: '西瓜', illustration: '🍉' },
];

export const FRUIT_B: VocabData[] = [
  { id: 'pineapple', word: 'パイナップル', meaning: '鳳梨', illustration: '🍍' },
  { id: 'strawberry', word: 'いちご', meaning: '草莓', illustration: '🍓' },
  { id: 'kiwi', word: 'キウイ', meaning: '奇異果', illustration: '🥝' },
  { id: 'lemon', word: 'レモン', meaning: '檸檬', illustration: '🍋' },
  { id: 'banana', word: 'バナナ', meaning: '香蕉', illustration: '🍌' },
];
