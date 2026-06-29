<script lang="ts">
  interface Props {
    current: string;
  }

  let { current }: Props = $props();
  let selected = $state(current);

  function navigate(e: Event) {
    const target = e.target as HTMLSelectElement;
    window.location.href = target.value;
  }
</script>

<select class="page-nav" bind:value={selected} onchange={navigate}>
  <option value="/">Pokémon</option>
  <option value="/trainers">Trainers</option>
</select>

<style>
  .page-nav {
    width: 100%;
    height: 42px;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent);
    background: var(--panel);
    border: none;
    border-radius: 0;
    padding: 0 2rem 0 0;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa3b2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.4rem center;
    background-size: 14px;
    cursor: pointer;
    transition: color 0.15s;
  }
  .page-nav:hover { color: #6b91e6; }
  .page-nav:focus {
    outline: none;
    color: #6b91e6;
  }
  .page-nav option {
    font-size: 0.9rem;
    font-weight: normal;
    background: var(--panel);
    color: var(--text);
  }
</style>
