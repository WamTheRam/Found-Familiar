export function Logo({ size = 28 }: { size?: number }) {
  return <img src="/owl.svg" width={size} height={size} alt="" className="logo-img" />;
}
