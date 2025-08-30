---
date: 2025-08-27
layout: post.pug
title: Install Intel GPU Operator
---

Now that I have Wireguard working on my client with an [Intel Arc A750](https://www.intel.com/content/www/us/en/products/sku/227954/intel-arc-a750-graphics/specifications.html), I can configure it to mount an NFS path for the [NFS Container Storage Interface (CSI) driver](https://github.com/kubernetes-csi/csi-driver-nfs).

# Install NFS CSI driver

I download the the NFS CSI driver repo but I don't like blindly running other people's code on my systems, so I read through the instructions and, to install 4.11.0, I need to run the following command.

```bash
./deploy/install-driver v4.11.0 local
```

Which boils down to the following:

```bash
kubectl apply -f "./deploy/v4.11.0/rbac-csi-nfs.yaml"
kubectl apply -f "./deploy/v4.11.0/csi-nfs-driverinfo.yaml"
kubectl apply -f "./deploy/v4.11.0/csi-nfs-controller.yaml"
kubectl apply -f "./deploy/v4.11.0/csi-nfs-node.yaml"
```

Then check the pod status.

```bash
kubectl -n kube-system get pod -o wide -l app=csi-nfs-controller
kubectl -n kube-system get pod -o wide -l app=csi-nfs-node
```

Output of those commands were:

```text
NAME                                 READY   STATUS    RESTARTS        AGE   IP             NODE      NOMINATED NODE   READINESS GATES
csi-nfs-controller-8d7689bf7-kbm8l   5/5     Running   333 (11m ago)   8d    192.168.0.3    client2   <none>           <none>
NAME                 READY   STATUS    RESTARTS       AGE   IP             NODE        NOMINATED NODE   READINESS GATES
csi-nfs-node-2d5tj   3/3     Running   18 (11s ago)   8d    192.168.0.2    client1     <none>           <none>
csi-nfs-node-6pvjg   3/3     Running   0              8d    192.168.0.1    nas         <none>           <none>
csi-nfs-node-c8f5r   3/3     Running   3 (11s ago)    8d    192.168.0.3    client2     <none>           <none>
```

All looks good, so we'll move on to installing the Intel GPU Operator following [these instructions](https://intel.github.io/intel-device-plugins-for-kubernetes/cmd/operator/README.html#installation). The instructions first call this command.

# Install Intel GPU Operator

## Node Feature Discovery

```bash
kubectl apply -k 'https://github.com/intel/intel-device-plugins-for-kubernetes/deployments/nfd?ref=<RELEASE_VERSION>'
```

Again, I won't blindly run the command, so I download the repo version that matches my k3s version based on the [Supported Kubernetes Version](https://github.com/intel/intel-device-plugins-for-kubernetes/tree/main#supported-kubernetes-versions), which is `release-0.31`.

The `./deployments/nfd/kustomization.yaml` leads to a `./deployments/nfd/base/kustomization.yaml` that calls on a kustomization `node-feature-discovery/deployment/overlays/default` version `v0.16.4`.

I download `v0.16.4` of [Node Feature Discovery (NFD)](https://github.com/kubernetes-sigs/node-feature-discovery) and find that the `./deployment/overlays/default` kustomization looks for the following kustomizations.

```yaml
namespace: node-feature-discovery

resources:
- ../../base/rbac
- ../../base/nfd-crds
- ../../base/master
- ../../base/worker-daemonset
- ../../base/gc
- namespace.yaml

components:
- ../../components/worker-config
- ../../components/common
- ../../components/master-config
```

None of those kustomizations call out to external kustomizations, so I execute the `./deployment/overlays/default` kustomization.

```bash
kubectl apply -k ./deployment/overlays/default
```

There are no issues.

```
namespace/node-feature-discovery created
customresourcedefinition.apiextensions.k8s.io/nodefeaturegroups.nfd.k8s-sigs.io created
customresourcedefinition.apiextensions.k8s.io/nodefeaturerules.nfd.k8s-sigs.io created
customresourcedefinition.apiextensions.k8s.io/nodefeatures.nfd.k8s-sigs.io created
serviceaccount/nfd-gc created
serviceaccount/nfd-master created
serviceaccount/nfd-worker created
role.rbac.authorization.k8s.io/nfd-worker created
clusterrole.rbac.authorization.k8s.io/nfd-gc created
clusterrole.rbac.authorization.k8s.io/nfd-master created
rolebinding.rbac.authorization.k8s.io/nfd-worker created
clusterrolebinding.rbac.authorization.k8s.io/nfd-gc created
clusterrolebinding.rbac.authorization.k8s.io/nfd-master created
configmap/nfd-master-conf created
configmap/nfd-worker-conf created
deployment.apps/nfd-gc created
Warning: spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].preference.matchExpressions[0].key: node-role.kubernetes.io/master is use "node-role.kubernetes.io/control-plane" instead
deployment.apps/nfd-master created
daemonset.apps/nfd-worker created
```

## Node labelling rules

The Intel GPU Operator instructions specify installing the node labelling rules.

```bash
kubectl apply -k 'https://github.com/intel/intel-device-plugins-for-kubernetes/deployments/nfd/overlays/node-feature-rules?ref=<RELEASE_VERSION>'
```

Again, verify the contents of the command and find there are no external dependencies. Execute the kustomization.

```bash
kubectl apply -k ./deployments/nfd/overlays/node-feature-rules
```

Verify the master and worker pods are running:

```text
$ kubectl get pods -n node-feature-discovery
NAME                          READY   STATUS    RESTARTS        AGE
nfd-gc-7d677fb9f9-zdkdn       1/1     Running   0               16s
nfd-master-75879679d7-7m86j   1/1     Running   0               16s
nfd-worker-2bq6d              1/1     Running   0               16s
nfd-worker-ctsgd              1/1     Running   0               16s
nfd-worker-tlncb              1/1     Running   1 (6h58m ago)   16s
```

After a minute, check for GPU labels.

```text
$ kubectl get no -o json | grep intel.feature.node.kubernetes.io/gpu
                    "nfd.node.kubernetes.io/feature-labels": "...,gpu.intel.com/device-id.0300-56a1.count,gpu.intel.com/device-id.0300-56a1.present,gpu.intel.com/device-id.0380-a780.count,gpu.intel.com/device-id.0380-a780.present,gpu.intel.com/family,intel.feature.node.kubernetes.io/gpu,...",
                    "nfd.node.kubernetes.io/feature-labels": "...,gpu.intel.com/device-id.0300-041e.count,gpu.intel.com/device-id.0300-041e.present,intel.feature.node.kubernetes.io/gpu,...",
```

Looks like the Intel GPU rules are working.

## Cert-Manager

There's no version requirements specified in the Intel GPU Operator documentation, so I'll install the latest version `v1.18.2`.

```bash
wget -O cert-manager-1.18.2.yaml https://github.com/cert-manager/cert-manager/releases/download/v1.18.2/cert-manager.yaml
```

The install command from the [cert-manager installation documentation](https://cert-manager.io/docs/installation/kubectl/):

```bash
kubectl apply -f cert-manager-1.18.2.yaml
```

Verify the pods are running.

```text
$ kubectl get pods --namespace cert-manager
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-5fbb96f87c-z7t6b              1/1     Running   0          37s
cert-manager-cainjector-55ff785bb9-686p9   1/1     Running   0          37s
cert-manager-webhook-6fb4454664-n87vl      1/1     Running   0          36s
```

## Device Plugin Operator

The Intel GPU Operator documentation provides the command for deploying the Operator:

```bash
kubectl apply -k 'https://github.com/intel/intel-device-plugins-for-kubernetes/deployments/operator/default?ref=<RELEASE_VERSION>'
```

No remote resources with the kustomization, so execute the kustomization locally:

```bash
kubectl apply -k ./deployments/operator/default
```

No issues.
