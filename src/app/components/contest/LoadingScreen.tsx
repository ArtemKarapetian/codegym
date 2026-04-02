export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[var(--tinkoff-gray)]">
      <img src="/logo.png" alt="Код спорта" className="h-6 animate-pulse" />
      <div className="animate-spin w-6 h-6 border-3 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
    </div>
  );
}
