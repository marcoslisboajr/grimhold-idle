/** Ícone pequeno em pixel (do pack), usado no lugar dos emojis da interface. */
export function Pix(props: { name: string; title?: string }) {
  return <img className="icon tiny pix" src={`/assets/icons/${props.name}.png`} alt={props.title ?? ''} title={props.title} />;
}
