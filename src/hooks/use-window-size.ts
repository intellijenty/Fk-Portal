import { useState, useEffect } from "react"

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function handleResize() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight })
      }, 100)
    }
    window.addEventListener("resize", handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return size
}
