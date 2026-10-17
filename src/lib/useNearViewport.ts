import { useEffect, useRef, useState } from "react";

export function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, hasEnteredViewport };
}
