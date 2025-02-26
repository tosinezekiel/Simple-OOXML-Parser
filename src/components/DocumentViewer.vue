<script setup>
import { ref, inject, computed } from 'vue';
const parsedDocument = inject('parsedDocument');

const showToc = ref(false);
const tocVisible = ref(false);

const tableOfContents = computed(() => {
  if (!parsedDocument.value) return [];
  
  const headings = parsedDocument.value.headings || [];
  return headings.map(heading => ({
    ...heading,
    indentClass: `ml-${heading.level * 4}`
  }));
});

const toggleToc = () => {
  tocVisible.value = !tocVisible.value;
};

const scrollToHeading = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    tocVisible.value = false;
  }
};

const handlePrint = () => {
  window.print();
};
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
      <h2 class="text-lg sm:text-xl font-bold text-gray-800">
        Document Viewer
      </h2>
      
      <div class="flex flex-wrap gap-2">
        <button 
          v-if="tableOfContents.length > 0"
          @click="toggleToc"
          class="px-2 sm:px-3 py-1 text-sm sm:text-base bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
        >
          {{ tocVisible ? 'Hide' : 'Show' }} Table of Contents
        </button>
        
        <button 
          @click="handlePrint"
          class="px-2 sm:px-3 py-1 text-sm sm:text-base bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
        >
          Print
        </button>
      </div>
    </div>
    
  </div>
</template>