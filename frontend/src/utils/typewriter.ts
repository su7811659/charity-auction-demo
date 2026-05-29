export const typewriter = (
    text: string,
    setter: (val: string) => void,
    setImage?: (src: string) => void,
    talkingImage?: string,
    idleImage?: string,
    delay = 25,
    noIdle = false,
    pixelMode = false,
    registerCancel?: (cancel: () => void) => void,
  ): Promise<void> => {
    return new Promise((resolve) => {
      const chars = Array.from(text);
      let current = "";
      let index = 0;
      let cancelled = false;
      let timeoutId: number | null = null;
      setter("");

      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
      };
      const finish = () => {
        cleanup();
        if (setImage && idleImage) setImage(idleImage);
        resolve();
      };

      const cancel = () => {
        if (cancelled) return;
        cancelled = true;
        setter(text); // 直接顯示全文
        finish();
      };

      if (registerCancel) registerCancel(cancel);
      if (setImage && talkingImage) setImage(talkingImage);

      const typeNextChar = () => {
        if (cancelled) return; // 已取消
        if (index >= chars.length) {
          finish();
          return;
        }

        const char = chars[index];
        current += char;
        setter(current);
        index++;

        const isPauseChar = /[!?。？！]/.test(char);
        const actualDelay = pixelMode ? Math.max(delay, 40) : delay;
        const nextDelay = (isPauseChar && !noIdle) ? 300 : actualDelay;

        if (!noIdle && isPauseChar && setImage && idleImage && talkingImage) {
          setImage(idleImage);
          timeoutId = window.setTimeout(() => {
            if (cancelled) return;
            setImage(talkingImage);
            typeNextChar();
          }, nextDelay);
        } else {
          timeoutId = window.setTimeout(typeNextChar, nextDelay);
        }
      };

      typeNextChar();
    });
  };
