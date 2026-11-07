import { Merge, Scissors, FileText, Wand2, Image, Grid, Layout } from "lucide-react";

const tools = [
  { id: "pdf-merge", name: "Merge PDF", icon: Merge, category: "pdf", accept: ".pdf" },
  { id: "pdf-split", name: "Split PDF", icon: Scissors, category: "pdf", accept: ".pdf" },
  { id: "pdf-compress", name: "Compress PDF", icon: FileText, category: "pdf", accept: ".pdf" },
  { id: "pdf-enhance", name: "AI Enhance PDF", icon: Wand2, category: "pdf", accept: ".pdf" },

  { id: "img-compress", name: "Compress Image", icon: Image, category: "image", accept: "image/*" },
  { id: "img-resize", name: "Resize Image", icon: Grid, category: "image", accept: "image/*" },
  { id: "img-merge", name: "Merge Images", icon: Layout, category: "image", accept: "image/*" },
  { id: "img-enhance", name: "AI Enhance Image", icon: Wand2, category: "image", accept: "image/*" },
];

export default tools;
