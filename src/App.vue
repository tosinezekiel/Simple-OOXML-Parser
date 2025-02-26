<script setup>
import { ref, provide } from 'vue';
import FileUploader from './components/FileUploader.vue';
import DocumentViewer from './components/DocumentViewer.vue';

const parsedDocument = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');

const handleParsedDocument = (data) => {
  parsedDocument.value = data;
};

const handleLoadingState = (loading) => {
  isLoading.value = loading;
};

const handleError = (message) => {
  errorMessage.value = message;
};

provide('parsedDocument', parsedDocument);
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-4 sm:py-8">
    <div class="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
      <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-8">
        FirstRead OOXML Relationship Parser
      </h1>
      
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <FileUploader 
          @parsed-document="handleParsedDocument"
          @loading="handleLoadingState"
          @error="handleError"
        />
      </div>
      
      <div v-if="errorMessage" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
        <p>{{ errorMessage }}</p>
      </div>
      
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p class="mt-2 text-gray-600">Processing document...</p>
      </div>
      
      <div v-if="parsedDocument && !isLoading" class="bg-white rounded-lg shadow-lg p-6">
        <DocumentViewer />
      </div>
      
      <footer class="mt-12 text-center text-gray-500 text-sm">
        <p>FirstRead Technical Task - Vue.js and OOXML Processing</p>
      </footer>
    </div>
  </div>
</template>