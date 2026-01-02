<script lang="ts">
interface Props {
  size?: number;
  color?: string;
}

let { size = 24, color = "currentColor" }: Props = $props();

const dimensions = $derived(`${size}px`);
</script>

<svg xmlns="http://www.w3.org/2000/svg" height={dimensions} viewBox="0 -960 960 960" width={dimensions} fill={color}>
  <path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z"/>
</svg>