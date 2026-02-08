import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { db } from '@allpepper/task-orchestrator';
import { runMigrations } from '@allpepper/task-orchestrator/src/db/migrate';
import { DirectAdapter } from '../direct';
import { Priority } from '@allpepper/task-orchestrator';
import * as projects from '@allpepper/task-orchestrator/src/repos/projects';
import * as features from '@allpepper/task-orchestrator/src/repos/features';
import * as tasks from '@allpepper/task-orchestrator/src/repos/tasks';

// Run migrations once before all tests
beforeAll(() => {
  runMigrations();
});

// Setup test database
beforeEach(() => {
  // Clean up tables before each test
  db.run('DELETE FROM entity_tags');
  db.run('DELETE FROM sections');
  db.run('DELETE FROM tasks');
  db.run('DELETE FROM features');
  db.run('DELETE FROM projects');
});

afterAll(() => {
  // Final cleanup
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

    it('should advance task status', async () => {
      const createResult = tasks.createTask({
        title: 'Test Task',
        summary: 'A test task',
        priority: Priority.MEDIUM,
        complexity: 5,
      });
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        // Task starts at NEW, advance should move to ACTIVE
        const result = await adapter.advance(
          'task',
          createResult.data.id,
          createResult.data.version
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.entity.status).toBe('ACTIVE');
          expect(result.data.oldStatus).toBe('NEW');
          expect(result.data.newStatus).toBe('ACTIVE');
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
      const result = await adapter.getAllowedTransitions('task', 'NEW');
      expect(result.success).toBe(true);
      if (result.success) {
        // From NEW, the next state is ACTIVE
        expect(result.data).toContain('ACTIVE');
      }
    });

    it('should get workflow state for a task', async () => {
      const createResult = tasks.createTask({
        title: 'Workflow Test Task',
        summary: 'Testing workflow state',
        priority: Priority.MEDIUM,
        complexity: 3,
      });
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const result = await adapter.getWorkflowState('task', createResult.data.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.currentStatus).toBe('NEW');
          expect(result.data.nextStatus).toBe('ACTIVE');
          expect(result.data.prevStatus).toBeNull();
          expect(result.data.isTerminal).toBe(false);
        }
      }
    });
  });

  describe('Cascade Delete', () => {
    it('should fail to delete project with children when cascade is not set', async () => {
      const projectResult = projects.createProject({
        name: 'Project with Children',
        summary: 'Has features and tasks',
      });
      expect(projectResult.success).toBe(true);
      if (!projectResult.success) return;

      const featureResult = features.createFeature({
        projectId: projectResult.data.id,
        name: 'Child Feature',
        summary: 'A child feature',
        priority: Priority.HIGH,
      });
      expect(featureResult.success).toBe(true);

      const result = await adapter.deleteProject(projectResult.data.id);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('HAS_CHILDREN');
        expect(result.error).toContain('cascade: true');
      }
    });

    it('should delete project with children when cascade is true', async () => {
      const projectResult = projects.createProject({
        name: 'Project to Cascade Delete',
        summary: 'Will be cascade deleted',
      });
      expect(projectResult.success).toBe(true);
      if (!projectResult.success) return;

      const featureResult = features.createFeature({
        projectId: projectResult.data.id,
        name: 'Child Feature',
        summary: 'A child feature',
        priority: Priority.HIGH,
      });
      expect(featureResult.success).toBe(true);
      if (!featureResult.success) return;

      const taskResult = tasks.createTask({
        featureId: featureResult.data.id,
        title: 'Child Task',
        summary: 'A child task',
        priority: Priority.MEDIUM,
        complexity: 3,
      });
      expect(taskResult.success).toBe(true);
      if (!taskResult.success) return;

      const result = await adapter.deleteProject(projectResult.data.id, { cascade: true });
      expect(result.success).toBe(true);

      // Verify all entities are deleted
      const projectCheck = await adapter.getProject(projectResult.data.id);
      expect(projectCheck.success).toBe(false);

      const featureCheck = await adapter.getFeature(featureResult.data.id);
      expect(featureCheck.success).toBe(false);

      const taskCheck = await adapter.getTask(taskResult.data.id);
      expect(taskCheck.success).toBe(false);
    });

    it('should fail to delete feature with tasks when cascade is not set', async () => {
      const featureResult = features.createFeature({
        name: 'Feature with Tasks',
        summary: 'Has tasks',
        priority: Priority.HIGH,
      });
      expect(featureResult.success).toBe(true);
      if (!featureResult.success) return;

      const taskResult = tasks.createTask({
        featureId: featureResult.data.id,
        title: 'Child Task',
        summary: 'A child task',
        priority: Priority.MEDIUM,
        complexity: 3,
      });
      expect(taskResult.success).toBe(true);

      const result = await adapter.deleteFeature(featureResult.data.id);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('HAS_CHILDREN');
        expect(result.error).toContain('cascade: true');
      }
    });

    it('should delete feature with tasks when cascade is true', async () => {
      const featureResult = features.createFeature({
        name: 'Feature to Cascade Delete',
        summary: 'Will be cascade deleted',
        priority: Priority.HIGH,
      });
      expect(featureResult.success).toBe(true);
      if (!featureResult.success) return;

      const taskResult = tasks.createTask({
        featureId: featureResult.data.id,
        title: 'Child Task',
        summary: 'A child task',
        priority: Priority.MEDIUM,
        complexity: 3,
      });
      expect(taskResult.success).toBe(true);
      if (!taskResult.success) return;

      const result = await adapter.deleteFeature(featureResult.data.id, { cascade: true });
      expect(result.success).toBe(true);

      // Verify entities are deleted
      const featureCheck = await adapter.getFeature(featureResult.data.id);
      expect(featureCheck.success).toBe(false);

      const taskCheck = await adapter.getTask(taskResult.data.id);
      expect(taskCheck.success).toBe(false);
    });

    it('should delete empty project without cascade option', async () => {
      const projectResult = projects.createProject({
        name: 'Empty Project',
        summary: 'No children',
      });
      expect(projectResult.success).toBe(true);
      if (!projectResult.success) return;

      const result = await adapter.deleteProject(projectResult.data.id);
      expect(result.success).toBe(true);

      const projectCheck = await adapter.getProject(projectResult.data.id);
      expect(projectCheck.success).toBe(false);
    });

    it('should delete empty feature without cascade option', async () => {
      const featureResult = features.createFeature({
        name: 'Empty Feature',
        summary: 'No tasks',
        priority: Priority.MEDIUM,
      });
      expect(featureResult.success).toBe(true);
      if (!featureResult.success) return;

      const result = await adapter.deleteFeature(featureResult.data.id);
      expect(result.success).toBe(true);

      const featureCheck = await adapter.getFeature(featureResult.data.id);
      expect(featureCheck.success).toBe(false);
    });
  });
});
