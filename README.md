# 🎹: UniFlow-Audio: Unified Flow Matching for Audio Generation from Omni-Modalities

[![arXiv](https://img.shields.io/badge/arXiv-2509.24391-brightgreen.svg?style=flat-square)](https://arxiv.org/abs/2510.05875)  [![githubio](https://img.shields.io/badge/GitHub.io-Audio_Samples-blue?logo=Github&style=flat-square)](https://nieeim.github.io/LARA-Gen/) <!-- [![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-blue)](https://huggingface.co/spaces/haoheliu/audioldm-text-to-audio-generation) -->




This is the official repository for the paper "[LARA-Gen: Enabling Continuous Emotion Control for Music Generation Models via Latent Affective Representation Alignment](https://arxiv.org/abs/2510.05875)". LARA-Gen is a music generation model capable of producing high-quality music conditioned on continuous valence–arousal emotion labels (e.g., valence: 2.9, arousal: 4.6).

We provide the emotion evaluation part of LARA-Gen, including the Emotion Predictor and the emotion test set.
The Emotion Predictor estimates continuous valence–arousal values for a given music sample. 
Please refer to this [repo](https://github.com/NieeiM/LARA_Gen)


## :memo: TODO
- [x] Add Emotion Predicotr and testset. Refer to this [repo](https://github.com/NieeiM/LARA_Gen).


## :book: Citation

If you found the paper or the code useful, please consider citing
```bibtex
@article{Mei2024LARAGen,
  title={LARA-Gen: Enabling Continuous Emotion Control for Music Generation Models via Latent Affective Representation Alignment},
  author={Jiahao Mei and Xuenan Xu and Zeyu Xie and Zihao Zheng and Ye Tao and Yue Ding and Mengyue Wu},
  journal={arxiv},
  year={2025},
  url={https://arxiv.org/abs/2510.05875}
}
```

## :sparkles: Acknowledgements

We would like to express our gratitude to the following projects and their contributors, from which we have borrowed code or drawn inspiration:

- **[AudioCraft](https://github.com/facebookresearch/audiocraft)**
- **[Marble](https://github.com/a43992899/MARBLE)**
