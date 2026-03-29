export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[var(--tinkoff-gray)]">
      <div className="w-14 h-14 bg-[var(--tinkoff-yellow)] rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-2xl font-bold">CG</span>
      </div>
      <div className="animate-spin w-6 h-6 border-3 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
    </div>
  );
}
