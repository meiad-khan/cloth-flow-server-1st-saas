// backend/services/orderParserService.js

// --------------------------------------------------
// Address keywords list
// কাজ: Bangladesh-er common delivery area / city / location names detect করা
// --------------------------------------------------
const addressKeywords = [
  "dhaka",
  "ঢাকা",
  "uttara",
  "উত্তরা",
  "uttara sector",
  "উত্তরা সেক্টর",
  "mirpur",
  "মিরপুর",
  "pallabi",
  "পল্লবী",
  "kazipara",
  "কাজীপাড়া",
  "shewrapara",
  "শেওড়াপাড়া",
  "agargaon",
  "আগারগাঁও",
  "mohakhali",
  "মহাখালী",
  "banani",
  "বনানী",
  "gulshan",
  "গুলশান",
  "baridhara",
  "বারিধারা",
  "bashundhara",
  "বসুন্ধরা",
  "bashundhara r/a",
  "বসুন্ধরা আবাসিক",
  "niketon",
  "নিকেতন",
  "badda",
  "বাড্ডা",
  "rampura",
  "রামপুরা",
  "aftabnagar",
  "আফতাবনগর",
  "khilkhet",
  "খিলক্ষেত",
  "nikunja",
  "নিকুঞ্জ",
  "kuril",
  "কুড়িল",
  "kuril biswa road",
  "কুড়িল বিশ্বরোড",
  "tejgaon",
  "তেজগাঁও",
  "farmgate",
  "ফার্মগেট",
  "shyamoli",
  "শ্যামলী",
  "mohammadpur",
  "মোহাম্মদপুর",
  "adabor",
  "আদাবর",
  "dhanmondi",
  "ধানমন্ডি",
  "lalmatia",
  "লালমাটিয়া",
  "green road",
  "গ্রিন রোড",
  "panthapath",
  "পান্থপথ",
  "new market",
  "নিউ মার্কেট",
  "elephant road",
  "এলিফ্যান্ট রোড",
  "katabon",
  "কাটাবন",
  "shahbagh",
  "শাহবাগ",
  "ramna",
  "রমনা",
  "malibagh",
  "মালিবাগ",
  "moghbazar",
  "মগবাজার",
  "kakrail",
  "কাকরাইল",
  "segunbagicha",
  "সেগুনবাগিচা",
  "bailey road",
  "বেইলি রোড",
  "motijheel",
  "মতিঝিল",
  "paltan",
  "পল্টন",
  "gulistan",
  "গুলিস্তান",
  "fakirapool",
  "ফকিরাপুল",
  "shantinagar",
  "শান্তিনগর",
  "rajarbagh",
  "রাজারবাগ",
  "jatrabari",
  "যাত্রাবাড়ী",
  "shonir akhra",
  "শনির আখড়া",
  "demra",
  "ডেমরা",
  "meradia",
  "মেরাদিয়া",
  "basabo",
  "বাসাবো",
  "sabujbagh",
  "সবুজবাগ",
  "khilgaon",
  "খিলগাঁও",
  "goran",
  "গোড়ান",
  "maniknagar",
  "মানিকনগর",
  "wari",
  "ওয়ারী",
  "sutrapur",
  "সুত্রাপুর",
  "gendaria",
  "গেন্ডারিয়া",
  "lalbagh",
  "লালবাগ",
  "bakshibazar",
  "বকশীবাজার",
  "azimpur",
  "আজিমপুর",
  "chawkbazar",
  "চকবাজার",
  "islampur",
  "ইসলামপুর",
  "bangshal",
  "বংশাল",
  "narinda",
  "নারিন্দা",
  "hazaribagh",
  "হাজারীবাগ",
  "kamrangirchar",
  "কামরাঙ্গীরচর",

  "savar",
  "সাভার",
  "ashulia",
  "আশুলিয়া",
  "hemayetpur",
  "হেমায়েতপুর",
  "dhamrai",
  "ধামরাই",
  "keraniganj",
  "কেরানীগঞ্জ",
  "south keraniganj",
  "দক্ষিণ কেরানীগঞ্জ",
  "tongi",
  "টঙ্গী",
  "gazipur",
  "গাজীপুর",
  "board bazar",
  "বোর্ড বাজার",
  "chourasta",
  "চৌরাস্তা",
  "konabari",
  "কোনাবাড়ী",
  "pubail",
  "পুবাইল",
  "kaliakair",
  "কালিয়াকৈর",
  "narayanganj",
  "নারায়ণগঞ্জ",
  "fatullah",
  "ফতুল্লা",
  "siddhirganj",
  "সিদ্ধিরগঞ্জ",
  "rupganj",
  "রূপগঞ্জ",
  "purbachal",
  "পূর্বাচল",

  "chattogram",
  "chittagong",
  "চট্টগ্রাম",
  "cumilla",
  "comilla",
  "কুমিল্লা",
  "sylhet",
  "সিলেট",
  "rajshahi",
  "রাজশাহী",
  "khulna",
  "খুলনা",
  "barishal",
  "barisal",
  "বরিশাল",
  "rangpur",
  "রংপুর",
  "mymensingh",
  "ময়মনসিংহ",
  "bogura",
  "bogra",
  "বগুড়া",
  "jashore",
  "jessore",
  "যশোর",
  "cox's bazar",
  "coxs bazar",
  "কক্সবাজার",
  "feni",
  "ফেনী",
  "noakhali",
  "নোয়াখালী",
  "gulshan 1",
  "গুলশান ১",
  "gulshan 2",
  "গুলশান ২",
  "banasree",
  "বনশ্রী",
  "ওয়ারী",
  "uttarkhan",
  "উত্তরখান",
  "dakshinkhan",
  "দক্ষিণখান",
  "turag",
  "তুরাগ",
  "matuail",
  "মাতুয়াইল",
  "donia",
  "ডোনিয়া",
  "signboard",
  "সাইনবোর্ড",
  "bhulta",
  "ভুলতা",
  "kachpur",
  "কাঁচপুর",
  "sonargaon",
  "সোনারগাঁ",
  "narsingdi",
  "নরসিংদী",
  "munshiganj",
  "মুন্সিগঞ্জ",
  "mawa",
  "মাওয়া",
  "sreepur",
  "শ্রীপুর",
  "kapasia",
  "কাপাসিয়া",
  "mirzapur",
  "মির্জাপুর",
];

// --------------------------------------------------
// Address hint keywords
// কাজ: line-e exact place না থাকলেও location-like words detect করা
// --------------------------------------------------
const addressHints = [
  "road",
  "rd",
  "street",
  "st",
  "area",
  "sector",
  "block",
  "bazar",
  "circle",
  "bus stand",
  "রোড",
  "এলাকা",
  "সেক্টর",
  "ব্লক",
  "বাজার",
  "স্ট্যান্ড",
  "চৌরাস্তা",
];

const addressRegex = new RegExp(addressKeywords.join("|"), "i");
const addressHintRegex = new RegExp(addressHints.join("|"), "i");

// --------------------------------------------------
// Clothing product keywords
// কাজ: clothing business-e common product names detect করা
// --------------------------------------------------
const clothingRegex =
  /(shirt|tshirt|t-?shirt|tee|polo|hoodie|sweatshirt|jacket|blazer|coat|waistcoat|vest|shrug|cardigan|sweater|jumper|top|crop top|camisole|tank top|blouse|tunic|fatua|fotua|kurti|kameez|panjabi|punjabi|kurta|pajama|payjama|lungi|sherwani|three piece|3 piece|three-piece|salwar kameez|salwar|kamiz|orna|dupatta|lehenga|ghagra|gown|abaya|borka|burqa|hijab|niqab|khimar|pant|pants|trouser|jeans|joggers|leggings|shorts|capri|palazzo|skirt|saree|sari|shalwar|maxi|frock|anarkali|muffler|scarf|shawl|chador|cap|hat|belt|tie|socks|gloves|inner|genji|thermal|romper|onesie|nighty|nightdress|sleepwear|tracksuit|product|item|প্রডাক্ট|পণ্য|শার্ট|টি-শার্ট|টিশার্ট|টি শার্ট|পোলো|হুডি|সোয়েটশার্ট|জ্যাকেট|ব্লেজার|কোট|ওয়েস্টকোট|ভেস্ট|শ্রাগ|কার্ডিগান|সোয়েটার|জাম্পার|টপ|ক্রপ টপ|ব্লাউজ|টিউনিক|ফতুয়া|কুর্তি|কামিজ|পাঞ্জাবি|কুর্তা|পায়জামা|পাজামা|লুঙ্গি|শেরওয়ানি|থ্রি পিস|থ্রিপিস|৩ পিস|সালওয়ার কামিজ|সালওয়ার|ওড়না|দোপাট্টা|লেহেঙ্গা|ঘাগড়া|গাউন|আবায়া|বোরকা|হিজাব|নিকাব|খিমার|প্যান্ট|ট্রাউজার|জিন্স|জগার|লেগিংস|শর্টস|ক্যাপ্রি|পালাজ্জো|স্কার্ট|শাড়ি|সাড়ি|ম্যাক্সি|ফ্রক|আনারকলি|মাফলার|স্কার্ফ|শাল|চাদর|টুপি|ক্যাপ|বেল্ট|টাই|মোজা|গ্লাভস|ইনার|গেঞ্জি|থার্মাল|রোম্পার|ওয়ানসি|নাইটি|নাইটড্রেস|স্লিপওয়্যার|ট্র্যাকস্যুট)/i;

// --------------------------------------------------
// Color keywords
// কাজ: English + Bangla + Banglish color detect করা
// --------------------------------------------------
const colorRegex =
  /(black|white|pink|blue|red|green|yellow|grey|gray|brown|orange|purple|violet|magenta|cyan|gold|golden|silver|navy|maroon|teal|olive|kalo|sada|golapi|neel|lal|sobuj|soboj|holud|holod|dhushor|badami|komola|beguni|khoyeri|akashi|sonali|rupali|কালো|সাদা|গোলাপি|নীল|লাল|সবুজ|হলুদ|ধূসর|বাদামী|কমলা|বেগুনি|খয়েরি|আকাশি|সোনালী|রূপালী)/i;

// --------------------------------------------------
// Field aliases
// কাজ: label-based extraction-e একই field-er multiple possible names ধরা
// --------------------------------------------------
const fieldAliases = {
  customerName: ["name", "customer name", "নাম"],
  phone: [
    "phone",
    "phone number",
    "mobile",
    "contact",
    "ফোন",
    "মোবাইল",
    "নাম্বার",
  ],
  address: ["address", "delivery address", "ঠিকানা", "এড্রেস"],
  product: ["product", "item", "প্রডাক্ট", "পণ্য"],
  quantity: ["quantity", "qty", "pieces", "pcs", "piece", "টা", "টি", "পরিমাণ"],
  size: ["size", "সাইজ"],
  color: ["color", "colour", "কালার", "রং"],
  price: ["price", "amount", "total", "টাকা", "মূল্য", "দাম"],
};

const normalizeText = (text) => {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
};

const normalizeLines = (text) => {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const extractLabeledFields = (lines) => {
  const result = {
    customerName: "",
    phone: "",
    address: "",
    product: "",
    quantity: "",
    size: "",
    color: "",
    price: "",
  };

  for (const line of lines) {
    for (const field in fieldAliases) {
      for (const alias of fieldAliases[field]) {
        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`^${escapedAlias}\\s*[:\\-]?\\s*(.+)$`, "i");
        const match = line.match(pattern);

        if (match && !result[field]) {
          result[field] = match[1].trim();
        }
      }
    }
  }

  return result;
};

const extractPhone = (text) => {
  const match = text.match(/(?:\+8801|8801|01)[3-9]\d{8}/);
  return match ? match[0] : "";
};

const cleanPhoneValue = (value) => {
  if (!value) return "";
  const match = String(value).match(/(?:\+8801|8801|01)[3-9]\d{8}/);
  return match ? match[0] : "";
};

const extractSize = (text) => {
  const match = text.match(/\b(XXL|XL|L|M|S)\b/i);
  return match ? match[1].toUpperCase() : "";
};

const extractPrice = (text) => {
  const match = text.match(/(?:price|amount|total|টাকা|দাম)\s*[:\-]?\s*(\d+)/i);
  return match ? match[1] : "";
};

const extractQuantityFromBangla = (line) => {
  const banglaDigits = {
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };

  const normalized = line.replace(/[০-৯]/g, (d) => banglaDigits[d]);
  const match = normalized.match(/(\d+)\s*(pcs|pieces|piece|টা|টি|ta)?/i);
  return match ? Number(match[1]) : "";
};

const cleanAddressLine = (line) => {
  return line
    .replace(/^(address|ঠিকানা|এড্রেস)\s*/i, "")
    .replace(/^(hocche|hoise|hoilo|holo|হচ্ছে|হল|হইতাছে|হইলো|হইল)\s*/i, "")
    .replace(/^[:\-]\s*/, "")
    .trim();
};

// const cleanProductLine = (line) => {
//   const match = line.match(clothingRegex);
//   return match ? match[1].trim() : line.trim();
// };

const cleanProductLine = (line) => {
  return line
    .replace(/^(amar|my|আমার)\s*/i, "")
    .replace(/^\d+\s*(pcs|pieces|piece|pc|ta|টা|টি)?\s*/i, "")
    .replace(
      /^(ekta|akta|duita|one|two|একটা|একটি|দুইটা|তিনটা|চারটা|পাঁচটা|১টা|২টা|৩টা|৪টা|৫টা)\s*/i,
      "",
    )
    .replace(/\s*(lagbe|লাগবে|need)$/i, "")
    .trim();
};

const shouldTryQuantityFromLine = (line) => {
  const looksLikeAddress =
    addressRegex.test(line) ||
    addressHintRegex.test(line) ||
    /(address|ঠিকানা|এড্রেস)/i.test(line);

  const looksLikePhone =
    /(?:\+8801|8801|01)[3-9]\d{8}/.test(line) ||
    /(phone|mobile|contact|ফোন|মোবাইল|নাম্বার)/i.test(line);

  const looksLikePrice = /(price|amount|total|টাকা|দাম)/i.test(line);

  const looksLikeQtyOrProduct =
    /(qty|quantity|pcs|pieces|piece|ta|টা|টি)/i.test(line) ||
    clothingRegex.test(line);

  if (looksLikeAddress || looksLikePhone || looksLikePrice) {
    return false;
  }

  return looksLikeQtyOrProduct;
};

const detectMultipleColors = (text) => {
  const matches = text.match(
    /(black|white|pink|blue|red|green|yellow|grey|gray|brown|orange|purple|violet|magenta|cyan|gold|golden|silver|navy|maroon|teal|olive|kalo|sada|golapi|neel|lal|sobuj|soboj|holud|holod|dhushor|badami|komola|beguni|khoyeri|akashi|sonali|rupali|কালো|সাদা|গোলাপি|নীল|লাল|সবুজ|হলুদ|ধূসর|বাদামী|কমলা|বেগুনি|খয়েরি|আকাশি|সোনালী|রূপালী)/gi,
  );

  if (!matches) return false;

  const normalized = matches.map((item) => item.toLowerCase());
  const uniqueColors = [...new Set(normalized)];

  return uniqueColors.length > 1;
};

const fallbackExtract = (lines) => {
  const data = {
    customerName: "",
    phone: "",
    address: "",
    product: "",
    quantity: "",
    size: "",
    color: "",
    price: "",
  };

  for (const line of lines) {
    if (!data.phone && /(?:\+8801|8801|01)[3-9]\d{8}/.test(line)) {
      const phoneMatch = line.match(/(?:\+8801|8801|01)[3-9]\d{8}/);
      data.phone = phoneMatch ? phoneMatch[0] : "";
      continue;
    }

    if (!data.size) {
      const size = line.match(/\b(XXL|XL|L|M|S)\b/i);
      if (size) data.size = size[1].toUpperCase();
    }

    if (!data.quantity && shouldTryQuantityFromLine(line)) {
      const qty =
        extractQuantityFromBangla(line) ||
        (line.match(/(\d+)\s*(pcs|pieces|piece|ta|টা|টি)?/i)
          ? Number(line.match(/(\d+)\s*(pcs|pieces|piece|ta|টা|টি)?/i)[1])
          : "");

      if (qty) data.quantity = qty;
    }

    if (
      !data.address &&
      (/(address|ঠিকানা|এড্রেস)/i.test(line) ||
        addressRegex.test(line) ||
        addressHintRegex.test(line))
    ) {
      data.address = cleanAddressLine(line);
    }

    if (!data.product && clothingRegex.test(line)) {
      data.product = line;
    }

    if (!data.color) {
      const colorLabelMatch = line.match(
        /^(color|colour|কালার|রং)\s*[:\-]?\s*(.+)$/i,
      );

      if (colorLabelMatch) {
        data.color = colorLabelMatch[2].trim();
      } else {
        const standaloneColorMatch = line.match(
          /^(black|white|pink|blue|red|green|yellow|grey|gray|brown|orange|purple|violet|magenta|cyan|gold|golden|silver|navy|maroon|teal|olive|kalo|sada|golapi|neel|lal|sobuj|soboj|holud|holod|dhushor|badami|komola|beguni|khoyeri|akashi|sonali|rupali|কালো|সাদা|গোলাপি|নীল|লাল|সবুজ|হলুদ|ধূসর|বাদামী|কমলা|বেগুনি|খয়েরি|আকাশি|সোনালী|রূপালী)(\s+color)?$/i,
        );

        if (standaloneColorMatch) {
          data.color = standaloneColorMatch[1].trim();
        }
      }
    }

    if (!data.price) {
      const price = extractPrice(line);
      if (price) data.price = price;
    }

    if (
      !data.customerName &&
      /(?:name|নাম|amar nam|আমার নাম)\s*[:\-]?\s*(.+)$/i.test(line)
    ) {
      const match = line.match(
        /(?:name|নাম|amar nam|আমার নাম)\s*[:\-]?\s*(.+)$/i,
      );
      data.customerName = match ? match[1].trim() : "";
    }
  }

  if (!data.customerName && lines[0] && !/\d{5,}/.test(lines[0])) {
    data.customerName = lines[0];
  }

  return data;
};

const getMissingFields = (data) => {
  const requiredFields = [
    "customerName",
    "phone",
    "address",
    "product",
    "color",
    "size",
    "price"
  ];
  return requiredFields.filter((field) => !data[field]);
};

const parseOrderText = (rawText) => {
  const text = normalizeText(rawText);
  const lines = normalizeLines(text);

  const labeledData = extractLabeledFields(lines);
  const fallbackData = fallbackExtract(lines);

  const rawProductValue = labeledData.product || fallbackData.product || "";

  const finalData = {
    customerName: labeledData.customerName || fallbackData.customerName || "",
    phone: cleanPhoneValue(
      labeledData.phone || fallbackData.phone || extractPhone(text) || "",
    ),
    address: cleanAddressLine(
      labeledData.address || fallbackData.address || "",
    ),
    product: cleanProductLine(rawProductValue),
    quantity: labeledData.quantity || fallbackData.quantity || "",
    size: labeledData.size || fallbackData.size || extractSize(text) || "",
    color: labeledData.color || fallbackData.color || "",
    price: labeledData.price || fallbackData.price || extractPrice(text) || "",
  };

  if (!finalData.quantity && finalData.product) {
    finalData.quantity = 1;
  }

  if (!finalData.color && rawProductValue) {
    const productColorMatch = rawProductValue.match(colorRegex);

    if (productColorMatch) {
      finalData.color = productColorMatch[1].trim();
    }
  }

  const warnings = [];

  if (detectMultipleColors(text)) {
    warnings.push(
      "Multiple colors detected. Please verify color and quantity manually.",
    );
  }

  return {
    data: finalData,
    missingFields: getMissingFields(finalData),
    warnings,
  };
};

module.exports = {
  parseOrderText,
};
