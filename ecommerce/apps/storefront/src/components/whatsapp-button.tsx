import { waLink } from "@repo/db/utils";

// F3.5: some quando a loja não configurou o número
export function WhatsappButton({ phone, storeName, message }: { phone: string | null; storeName: string; message?: string }) {
  if (!phone) return null;
  const text = message ?? `Olá! Tenho uma dúvida sobre a loja ${storeName}.`;

  return (
    <a
      href={waLink(phone, text)}
      target="_blank"
      rel="noreferrer noopener"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-2xl text-white shadow-lg shadow-black/20 transition-transform hover:scale-105"
      aria-label="Falar no WhatsApp"
      data-testid="whatsapp-float-button"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.43 1.27 4.88L2 22l5.3-1.39A9.96 9.96 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm0 18.18c-1.56 0-3.03-.42-4.3-1.15l-.31-.18-3.15.83.84-3.07-.2-.32a7.95 7.95 0 0 1-1.26-4.3c0-4.42 3.6-8.02 8.02-8.02s8.02 3.6 8.02 8.02-3.6 8.19-8.02 8.19Zm4.4-6c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.1-.5.11-.12.24-.3.36-.45.12-.15.16-.26.24-.42.08-.16.04-.3-.03-.42-.07-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.64 2.5 3.98 3.41 2.34.9 2.34.6 2.76.56.42-.04 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28Z" />
      </svg>
    </a>
  );
}
