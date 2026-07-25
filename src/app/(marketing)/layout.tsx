export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-ink font-sans flex flex-col antialiased">
      {children}
    </div>
  );
}
