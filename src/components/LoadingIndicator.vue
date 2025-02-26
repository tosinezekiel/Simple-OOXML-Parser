<script setup>
const props = defineProps({
  size: {
    type: String,
    default: 'medium'
  },
  color: {
    type: String,
    default: 'blue'
  },
  fullscreen: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: 'Loading...'
  }
});

const sizeClasses = {
  small: 'w-6 h-6 border-2',
  medium: 'w-10 h-10 border-3',
  large: 'w-16 h-16 border-4'
};

const colorClasses = {
  blue: 'border-blue-500 border-t-transparent',
  gray: 'border-gray-500 border-t-transparent',
  green: 'border-green-500 border-t-transparent'
};
</script>

<template>
  <div :class="[
    'flex items-center justify-center',
    fullscreen ? 'fixed inset-0 bg-white bg-opacity-80 z-50' : ''
  ]">
    <div class="text-center">
      <div
        :class="[
          'spinner-border animate-spin inline-block rounded-full',
          sizeClasses[size],
          colorClasses[color]
        ]"
        role="status"
      >
        <span class="sr-only">Loading...</span>
      </div>
      <p v-if="text" class="mt-2 text-gray-600">{{ text }}</p>
    </div>
  </div>
</template>