export interface Option {
  OP_ID: number;
  OP_NAME: string;
}

export interface Question {
  Q_ID: string;
  Q_NAME: string;
  Q_ANS: string;
  ANS_DESC: string;
  childItems: Option[];
}

export interface ApiResponse {
  items: Question[];
}
