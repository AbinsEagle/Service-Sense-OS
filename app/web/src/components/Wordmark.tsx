export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-wide">
      <span className="grid gap-[3px] rounded-[3px] bg-primary p-[3px]" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-[#e5533d]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#e0ad00]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#3fc58f]" />
      </span>
      SERVICE SENSE OS
    </span>
  );
}
