'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { SelectorConfig } from '@/types';
import { Button, Card, CardContent, CardHeader, Input, Modal } from '@/components/ui';

interface Source {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  selectors: SelectorConfig;
  rateLimit: number;
  lastScrapedAt: string | null;
  articleCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const defaultSelectors: SelectorConfig = {
  listPage: {
    url: '',
    articleContainer: 'article',
    title: 'h2 a',
    link: 'h2 a',
    summary: 'p',
    image: 'img',
    date: 'time',
  },
  articlePage: {
    title: 'h1',
    content: '.article-content',
    image: '.article-image img',
    date: 'time',
    author: '.author',
  },
  transforms: {
    baseUrl: '',
  },
};

export default function SourcesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    rateLimit: 2000,
    isActive: true,
    selectors: defaultSelectors,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { data, mutate } = useSWR<{ success: boolean; data: Source[] }>(
    '/api/sources',
    fetcher
  );

  const sources = data?.data || [];

  const openAddModal = () => {
    setEditingSource(null);
    setFormData({
      name: '',
      url: '',
      rateLimit: 2000,
      isActive: true,
      selectors: defaultSelectors,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      rateLimit: source.rateLimit,
      isActive: source.isActive,
      selectors: source.selectors,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = editingSource
        ? `/api/sources/${editingSource.id}`
        : '/api/sources';
      const method = editingSource ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        mutate();
        setIsModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source? All associated articles will also be deleted.')) {
      return;
    }

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        mutate();
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (source: Source) => {
    await fetch(`/api/sources/${source.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !source.isActive }),
    });
    mutate();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Manage Sources
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Add, edit, or remove news sources
          </p>
        </div>
        <Button onClick={openAddModal}>Add Source</Button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {source.name}
                </h3>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {source.url}
                </a>
              </div>
              <button
                onClick={() => handleToggleActive(source)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  source.isActive
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    source.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Articles</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {source.articleCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Rate Limit</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {source.rateLimit}ms
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">List URL</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                    {source.selectors.listPage.url}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(source)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(source.id)}
                  isLoading={isDeleting === source.id}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No sources configured yet.
          </p>
          <Button onClick={openAddModal}>Add Your First Source</Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSource ? 'Edit Source' : 'Add Source'}
        className="max-w-2xl"
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Economic Times"
            />
            <Input
              label="Website URL"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rate Limit (ms)"
              type="number"
              value={formData.rateLimit}
              onChange={(e) =>
                setFormData({ ...formData, rateLimit: parseInt(e.target.value) || 2000 })
              }
            />
            <Input
              label="List Page URL"
              value={formData.selectors.listPage.url}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  selectors: {
                    ...formData.selectors,
                    listPage: {
                      ...formData.selectors.listPage,
                      url: e.target.value,
                    },
                  },
                })
              }
              placeholder="https://example.com/news"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
              List Page Selectors
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Article Container"
                value={formData.selectors.listPage.articleContainer}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    selectors: {
                      ...formData.selectors,
                      listPage: {
                        ...formData.selectors.listPage,
                        articleContainer: e.target.value,
                      },
                    },
                  })
                }
                placeholder="article, .news-item"
              />
              <Input
                label="Title Selector"
                value={formData.selectors.listPage.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    selectors: {
                      ...formData.selectors,
                      listPage: {
                        ...formData.selectors.listPage,
                        title: e.target.value,
                      },
                    },
                  })
                }
                placeholder="h2 a, .title"
              />
              <Input
                label="Link Selector"
                value={formData.selectors.listPage.link}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    selectors: {
                      ...formData.selectors,
                      listPage: {
                        ...formData.selectors.listPage,
                        link: e.target.value,
                      },
                    },
                  })
                }
                placeholder="h2 a"
              />
              <Input
                label="Summary Selector"
                value={formData.selectors.listPage.summary || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    selectors: {
                      ...formData.selectors,
                      listPage: {
                        ...formData.selectors.listPage,
                        summary: e.target.value,
                      },
                    },
                  })
                }
                placeholder="p, .desc"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
              Article Page Selectors
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Content Selector"
                value={formData.selectors.articlePage.content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    selectors: {
                      ...formData.selectors,
                      articlePage: {
                        ...formData.selectors.articlePage,
                        content: e.target.value,
                      },
                    },
                  })
                }
                placeholder=".article-content"
              />
              <Input
                label="Author Selector"
                value={formData.selectors.articlePage.author || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    selectors: {
                      ...formData.selectors,
                      articlePage: {
                        ...formData.selectors.articlePage,
                        author: e.target.value,
                      },
                    },
                  })
                }
                placeholder=".author"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
              Transforms
            </h4>
            <Input
              label="Base URL (for relative links)"
              value={formData.selectors.transforms?.baseUrl || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  selectors: {
                    ...formData.selectors,
                    transforms: {
                      ...formData.selectors.transforms,
                      baseUrl: e.target.value,
                    },
                  },
                })
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              className="flex-1"
            >
              {editingSource ? 'Save Changes' : 'Add Source'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
