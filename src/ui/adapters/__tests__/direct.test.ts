import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { db } from 'task-orchestrator-bun/src/db/client';
import { runMigrations } from 'task-orchestrator-bun/src/db/migrate';
import { DirectAdapter } from '../direct';
import { ProjectStatus, FeatureStatus, TaskStatus, Priority } from 'task-orchestrator-bun/src/domain/types';
import * as projects from 'task-orchestrator-bun/src/repos/projects';
import * as features from 'task-orchestrator-bun/src/repos/features';
import * as tasks from 'task-orchestrator-bun/src/repos/tasks';

// Run migrations once before all tests
beforeAll(() => {
  runMigrations();
});

// Setup test database
beforeEach(() => {
  // Clean up tables before each test
  db.run('DELETE FROM dependencies');
  db.run('DELETE FROM entity_tags');
  db.run('DELETE FROM sections');
  db.run('DELETE FROM tasks');
  db.run('DELETE FROM features');
  db.run('DELETE FROM projects');
});

afterAll(() => {
  // Final cleanup
  db.run('DELETE FROM dependencies');
  db.run('DELETE FROM entity_tags');
  db.run('DELETE FROM sections');
  db.run('DELETE FROM tasks');
  db.run('DELETE FROM features');
  db.run('DELETE FROM projects');
});

describe('DirectAdapter', () => {
  let adapter: DirectAdapter;

  beforeEach(() => {
    adapter = new DirectAdapter();
  });

  describe('Projects', () => {
    it('should get projects', async () => {
      // Create test data
      const createResult = projects.createProject({
        name: 'Test Project',
        summary: 'A test project',
      });
      expect(createResult.success).toBe(true);

      // Test adapter
      const result = await adapter.getProjects();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.name).toBe('Test Project');
      }
    });

    it('should get a single project', async () => {
      const createResult = projects.createProject({
        name: 'Test Project',
        summary: 'A test project',
      });
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const result = await adapter.getProject(createResult.data.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Test Project');
          expect(result.data.summary).toBe('A test project');
        }
      }
    });

    it('should get project overview', async () => {
      const projectResult = projects.createProject({
        name: 'Test Project',
        summary: 'A test project',
      });
      expect(projectResult.success).toBe(true);

      if (projectResult.success) {
        const result = await adapter.getProjectOverview(projectResult.data.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.project.id).toBe(projectResult.data.id);
          expect(result.data.project.name).toBe('Test Project');
          expect(result.data.taskCounts).toBeDefined();
          expect(result.data.taskCounts.total).toBe(0);
        }
      }
    });

    it('should search projects by query', async () => {
      projects.createProject({
        name: 'Alpha Project',
        summary: 'First project',
      });
      projects.createProject({
        name: 'Beta Project',
        summary: 'Second project',
      });

      const result = await adapter.getProjects({ query: 'alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.name).toBe('Alpha Project');
      }
    });
  });

  describe('Features', () => {
    it('should get features', async () => {
      const featureResult = features.createFeature({
        name: 'Test Feature',
        summary: 'A test feature',
        priority: Priority.MEDIUM,
      });
      expect(featureResult.success).toBe(true);

      const result = await adapter.getFeatures();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.name).toBe('Test Feature');
      }
    });

    it('should get a single feature', async () => {
      const createResult = features.createFeature({
        name: 'Test Feature',
        summary: 'A test feature',
        priority: Priority.HIGH,
      });
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const result = await adapter.getFeature(createResult.data.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Test Feature');
          expect(result.data.priority).toBe(Priority.HIGH);
        }
      }
    });

    it('should get feature overview', async () => {
      const featureResult = features.createFeature({
        name: 'Test Feature',
        summary: 'A test feature',
        priority: Priority.MEDIUM,
      });
      expect(featureResult.success).toBe(true);

      if (featureResult.success) {
        const result = await adapter.getFeatureOverview(featureResult.data.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.feature.id).toBe(featureResult.data.id);
          expect(result.data.feature.name).toBe('Test Feature');
          expect(result.data.feature.priority).toBe(Priority.MEDIUM);
          expect(result.data.taskCounts).toBeDefined();
          expect(result.data.taskCounts.total).toBe(0);
        }
      }
    });
  });

  describe('Tasks', () => {
    it('should get tasks', async () => {
      const taskResult = tasks.createTask({
        title: 'Test Task',
        summary: 'A test task',
        priority: Priority.MEDIUM,
        complexity: 5,
      });
      expect(taskResult.success).toBe(true);

      const result = await adapter.getTasks();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.title).toBe('Test Task');
      }
    });

    it('should get a single task', async () => {
      const createResult = tasks.createTask({
        title: 'Test Task',
        summary: 'A test task',
        priority: Priority.HIGH,
        complexity: 3,
      });
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const result = await adapter.getTask(createResult.data.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.title).toBe('Test Task');
          expect(result.data.priority).toBe(Priority.HIGH);
        }
      }
    });

    it('should set task status', async () => {
      const createResult = tasks.createTask({
        title: 'Test Task',
        summary: 'A test task',
        priority: Priority.MEDIUM,
        complexity: 5,
        status: TaskStatus.PENDING,
      });
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const result = await adapter.setTaskStatus(
          createResult.data.id,
          TaskStatus.IN_PROGRESS,
          createResult.data.version
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(TaskStatus.IN_PROGRESS);
          expect(result.data.version).toBe(createResult.data.version + 1);
        }
      }
    });
  });

  describe('Search', () => {
    it('should search across all entity types', async () => {
      projects.createProject({
        name: 'Search Test Project',
        summary: 'Searchable project',
      });
      features.createFeature({
        name: 'Search Test Feature',
        summary: 'Searchable feature',
        priority: Priority.MEDIUM,
      });
      tasks.createTask({
        title: 'Search Test Task',
        summary: 'Searchable task',
        priority: Priority.MEDIUM,
        complexity: 5,
      });

      const result = await adapter.search('search test');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projects.length).toBeGreaterThan(0);
        expect(result.data.features.length).toBeGreaterThan(0);
        expect(result.data.tasks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Workflow', () => {
    it('should get allowed transitions', async () => {
      const result = await adapter.getAllowedTransitions('task', TaskStatus.PENDING);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain(TaskStatus.IN_PROGRESS);
        expect(result.data).toContain(TaskStatus.BLOCKED);
      }
    });
  });
});
