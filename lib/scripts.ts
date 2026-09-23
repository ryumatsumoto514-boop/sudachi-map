import type { ResourceCategory } from "@/types/resource";

export interface ScriptTemplate {
  id: string;
  situation: string;
  medium: "電話" | "チャット・LINE";
  text: string;
}

export interface ScriptCategoryGroup {
  category: ResourceCategory;
  note: string;
  templates: ScriptTemplate[];
}

// Plain-language templates the user can read aloud or paste into a chat/LINE
// window. "◯◯" marks a spot to fill in with their own details.
export const SCRIPT_GROUPS: ScriptCategoryGroup[] = [
  {
    category: "housing",
    note: "保証人がいない状態で部屋を探すときや、住まいを失いそうなときに使えます。",
    templates: [
      {
        id: "housing-call",
        situation: "住まい探しの相談をする",
        medium: "電話",
        text: "もしもし、住まいのことでご相談したくてお電話しました。児童養護施設を出た者で、名前は◯◯です。保証人がいない状態で住める部屋を探しています。今、相談に乗っていただくことはできますか。",
      },
      {
        id: "housing-chat",
        situation: "住まい探しの相談をする",
        medium: "チャット・LINE",
        text: "はじめまして。住まい探しについて相談したくご連絡しました。児童養護施設を出た◯◯と申します。保証人なしで借りられる物件について教えていただけますでしょうか。",
      },
      {
        id: "housing-lose",
        situation: "住まいを失いそう・失った",
        medium: "電話",
        text: "もしもし、住む場所のことで困っていてお電話しました。名前は◯◯です。今の家に住み続けられなくなりそうで、相談できる場所を探しています。どうすればよいか教えていただけますか。",
      },
    ],
  },
  {
    category: "money",
    note: "奨学金・給付金・生活費の貸付など、お金に関する制度の対象になるか確認するときに使えます。",
    templates: [
      {
        id: "money-call",
        situation: "制度の対象か確認する",
        medium: "電話",
        text: "もしもし、生活費の支援についてご相談したくお電話しました。児童養護施設を出た◯◯といいます。◯◯（制度名）について、自分が対象になるか教えていただけますか。",
      },
      {
        id: "money-chat",
        situation: "制度の対象か確認する",
        medium: "チャット・LINE",
        text: "はじめまして。◯◯（制度名）について相談したくご連絡しました。児童養護施設を退所した◯◯と申します。申し込み方法や必要な書類を教えていただけると助かります。",
      },
    ],
  },
  {
    category: "work",
    note: "ハローワークやサポステなど、就職・仕事の相談窓口に連絡するときに使えます。",
    templates: [
      {
        id: "work-call",
        situation: "就職相談を申し込む",
        medium: "電話",
        text: "もしもし、お仕事のご相談でお電話しました。名前は◯◯です。児童養護施設を出て就職活動をしています。相談の予約をお願いできますか。",
      },
      {
        id: "work-chat",
        situation: "就職相談を申し込む",
        medium: "チャット・LINE",
        text: "はじめまして。就職についてご相談したくご連絡しました。◯◯と申します。まだ働いた経験が少ないのですが、相談は可能でしょうか。",
      },
    ],
  },
  {
    category: "education",
    note: "奨学金の申し込みや、進学に関する質問をするときに使えます。",
    templates: [
      {
        id: "education-call",
        situation: "奨学金について問い合わせる",
        medium: "電話",
        text: "もしもし、奨学金についてご相談したくお電話しました。名前は◯◯です。児童養護施設出身者向けの奨学金について、自分が対象になるか、申し込み方法を教えていただけますか。",
      },
      {
        id: "education-chat",
        situation: "奨学金について問い合わせる",
        medium: "チャット・LINE",
        text: "はじめまして。進学と奨学金について相談したくご連絡しました。◯◯と申します。児童養護施設を出て進学を考えているのですが、利用できる制度を教えていただけますでしょうか。",
      },
    ],
  },
  {
    category: "procedures",
    note: "契約トラブルや、役所での手続きについて分からないことを聞くときに使えます。",
    templates: [
      {
        id: "procedures-call",
        situation: "手続き・契約について相談する",
        medium: "電話",
        text: "もしもし、手続きのことでご相談したくお電話しました。名前は◯◯です。◯◯についてどうすればよいか分からず、教えていただきたいです。今、お時間よろしいでしょうか。",
      },
      {
        id: "procedures-chat",
        situation: "手続き・契約について相談する",
        medium: "チャット・LINE",
        text: "はじめまして。◯◯の手続きについて相談したくご連絡しました。◯◯と申します。何から始めればよいか分からないので、教えていただけると助かります。",
      },
    ],
  },
  {
    category: "emergency",
    note: "今すぐ危ない・助けが必要なときは、できれば短くはっきり伝えてください。無理に長く話さなくて大丈夫です。",
    templates: [
      {
        id: "emergency-call",
        situation: "今すぐ助けが必要なとき",
        medium: "電話",
        text: "助けてください。今、◯◯（場所）にいて、危険な状況にいます。名前は◯◯です。",
      },
      {
        id: "emergency-chat",
        situation: "今すぐ助けが必要なとき",
        medium: "チャット・LINE",
        text: "今、助けが必要です。◯◯（今の状況）で困っています。名前は◯◯です。今いる場所は◯◯です。",
      },
    ],
  },
];
