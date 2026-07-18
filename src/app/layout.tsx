import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/mct/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "全国文化和旅游数据可视化大屏 | 文旅部数据服务",
  description:
    "基于文化和旅游部数据服务栏目（sjfw.mct.gov.cn）公开名录数据，提供5A景区、五星饭店、滑雪度假地、旅游休闲街区、工业旅游示范基地、国家级度假区、旅游民宿、乡村振兴试点8类数据的地图可视化呈现。",
  keywords: [
    "文化和旅游部",
    "文旅数据",
    "5A景区",
    "五星饭店",
    "旅游度假区",
    "数据可视化",
    "中国地图",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 防止主题闪烁：hydrate 前按 URL?theme= > localStorage > dark 设 <html> class
  const themeScript = `(function(){try{var k='mct-theme';var u=new URLSearchParams(location.search).get('theme');var s=localStorage.getItem(k);var t=(u==='dark'||u==='light')?u:(s==='dark'||s==='light'?s:'dark');var r=document.documentElement;r.classList.remove('dark','light');r.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
